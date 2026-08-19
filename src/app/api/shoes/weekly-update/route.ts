import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  parseShoeQuery,
  fetchReviewsForShoe,
  findImageForShoe,
  shoeToSlug,
  webSearch,
} from '@/lib/shoe-enrichment';
import { completeText } from '@/lib/llm';

export const maxDuration = 300;

const MAX_NEW_SHOES = 5;
const STALE_DAYS = 30;
const MAX_STALE_REFRESH = 10;
const MAX_IMAGE_RETRY = 5;

function streamLine(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'));
}

interface DiscoveredShoe {
  brand: string;
  model: string;
}

async function discoverNewShoes(): Promise<DiscoveredShoe[]> {

  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();

  const queries = [
    `best new running shoes ${month} ${year}`,
    `new trail running shoes ${year}`,
    `new road running shoes ${year}`,
  ];

  const allSnippets: string[] = [];

  for (const query of queries) {
    try {
      const results = await webSearch(query, 8);
      for (const r of results) {
        allSnippets.push(`${r.title}\n${r.description}`);
      }
    } catch { /* skip failed search */ }
    await sleep(1100);
  }

  const text = await completeText({
    maxTokens: 1500,
    prompt: `Extract all specific running shoe models mentioned in these search results. Only include shoes where you can identify both the brand and the specific model name (including version number).

Search results:
${allSnippets.slice(0, 20).join('\n---\n')}

Reply with ONLY a JSON array of objects, no markdown:
[{"brand": "Brand Name", "model": "Model Name With Version"}]

Rules:
- Include version numbers (e.g., "Clifton 10" not just "Clifton")
- Only include real, specific running shoe models
- Capitalize brand and model names properly
- No duplicates`,
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 503 });
  }
  if (!process.env.BRAVE_SEARCH_API_KEY && !process.env.SERPER_API_KEY) {
    return Response.json({ error: 'No search API key configured (BRAVE_SEARCH_API_KEY or SERPER_API_KEY)' }, { status: 503 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let newShoesAdded = 0;
      let reviewsRefreshed = 0;
      let imagesFound = 0;

      try {
        // ── Phase 1: Discover new shoes ──
        streamLine(controller, { phase: 'discovery', message: 'Searching for new shoe releases...' });
        const discovered = await discoverNewShoes();
        streamLine(controller, { phase: 'discovery', message: `Found ${discovered.length} shoe mentions` });

        for (const shoe of discovered) {
          if (newShoesAdded >= MAX_NEW_SHOES) break;

          const rawSlug = shoeToSlug(shoe.brand, shoe.model);
          const rawExists = await prisma.shoes.findUnique({ where: { slug: rawSlug } });
          if (rawExists) {
            streamLine(controller, { phase: 'discovery', message: `Skip: ${shoe.brand} ${shoe.model} (exists)` });
            continue;
          }

          streamLine(controller, { phase: 'discovery', message: `Adding: ${shoe.brand} ${shoe.model}...` });
          try {
            const parsed = await parseShoeQuery(`${shoe.brand} ${shoe.model}`);
            const parsedSlug = shoeToSlug(parsed.brand, parsed.model);
            const parsedExists = await prisma.shoes.findUnique({ where: { slug: parsedSlug } });
            if (parsedExists) {
              streamLine(controller, { phase: 'discovery', message: `Skip: ${parsed.brand} ${parsed.model} (exists after parse)` });
              continue;
            }

            const created = await prisma.shoes.create({
              data: {
                brand: parsed.brand,
                model: parsed.model,
                slug: parsedSlug,
                terrain: parsed.terrain,
                category: parsed.category,
                drop_mm: parsed.drop_mm,
                weight_g: parsed.weight_g,
                stack_height_mm: parsed.stack_height_mm,
                price_gbp: parsed.price_gbp,
                release_year: parsed.release_year,
                description: parsed.description ? `${parsed.description} [auto-discovered]` : '[auto-discovered]',
              },
            });

            const reviews = await fetchReviewsForShoe(parsed.brand, parsed.model);
            if (reviews.length > 0) {
              for (const review of reviews) {
                await prisma.shoe_reviews.upsert({
                  where: { shoe_id_source: { shoe_id: created.id, source: review.source } },
                  update: { source_url: review.source_url, expert_score: review.expert_score, summary: review.summary, fetched_at: new Date() },
                  create: { shoe_id: created.id, source: review.source, source_url: review.source_url, expert_score: review.expert_score, summary: review.summary },
                });
              }
              const scores = reviews.map(r => r.expert_score);
              const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
              await prisma.shoes.update({
                where: { id: created.id },
                data: { avg_score: avgScore, review_count: reviews.length, last_reviewed: new Date() },
              });
            }

            const imageResult = await findImageForShoe(parsed.brand, parsed.model);
            if (imageResult) {
              await prisma.shoes.update({ where: { id: created.id }, data: { image_url: imageResult.url } });
            }

            newShoesAdded++;
            streamLine(controller, { phase: 'discovery', message: `+ ${parsed.brand} ${parsed.model} (${reviews.length} reviews, ${imageResult ? 'image found' : 'no image'})` });
          } catch (err) {
            streamLine(controller, { phase: 'discovery', message: `Error adding ${shoe.brand} ${shoe.model}: ${err instanceof Error ? err.message : 'unknown'}` });
          }
        }

        // ── Phase 2: Refresh stale reviews ──
        streamLine(controller, { phase: 'reviews', message: 'Refreshing stale reviews...' });
        const staleDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
        const staleShoes = await prisma.shoes.findMany({
          where: { OR: [{ last_reviewed: null }, { last_reviewed: { lt: staleDate } }] },
          orderBy: { last_reviewed: 'asc' },
          take: MAX_STALE_REFRESH,
        });

        for (const shoe of staleShoes) {
          try {
            const reviews = await fetchReviewsForShoe(shoe.brand, shoe.model);
            if (reviews.length > 0) {
              for (const review of reviews) {
                await prisma.shoe_reviews.upsert({
                  where: { shoe_id_source: { shoe_id: shoe.id, source: review.source } },
                  update: { source_url: review.source_url, expert_score: review.expert_score, summary: review.summary, fetched_at: new Date() },
                  create: { shoe_id: shoe.id, source: review.source, source_url: review.source_url, expert_score: review.expert_score, summary: review.summary },
                });
              }
              const allReviews = await prisma.shoe_reviews.findMany({ where: { shoe_id: shoe.id } });
              const scores = allReviews.map(r => r.expert_score ? Number(r.expert_score) : null).filter((s): s is number => s !== null);
              const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
              await prisma.shoes.update({
                where: { id: shoe.id },
                data: { avg_score: avgScore, review_count: allReviews.length, last_reviewed: new Date() },
              });
              reviewsRefreshed++;
              streamLine(controller, { phase: 'reviews', message: `Updated: ${shoe.brand} ${shoe.model} (${reviews.length} reviews)` });
            } else {
              await prisma.shoes.update({ where: { id: shoe.id }, data: { last_reviewed: new Date() } });
            }
          } catch {
            streamLine(controller, { phase: 'reviews', message: `Error refreshing ${shoe.brand} ${shoe.model}` });
          }
        }

        // ── Phase 3: Retry missing images ──
        streamLine(controller, { phase: 'images', message: 'Retrying missing images...' });
        const shoesWithoutImages = await prisma.shoes.findMany({
          where: { image_url: null },
          take: MAX_IMAGE_RETRY,
        });

        for (const shoe of shoesWithoutImages) {
          try {
            const imageResult = await findImageForShoe(shoe.brand, shoe.model);
            if (imageResult) {
              await prisma.shoes.update({ where: { id: shoe.id }, data: { image_url: imageResult.url } });
              imagesFound++;
              streamLine(controller, { phase: 'images', message: `Found image: ${shoe.brand} ${shoe.model}` });
            }
          } catch { /* skip */ }
        }

        // ── Summary ──
        const duration = Math.round((Date.now() - startTime) / 1000);
        streamLine(controller, {
          phase: 'complete',
          message: `Done in ${duration}s`,
          summary: { newShoesAdded, reviewsRefreshed, imagesFound, durationSeconds: duration },
        });
      } catch (err) {
        streamLine(controller, { phase: 'error', message: err instanceof Error ? err.message : 'unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
