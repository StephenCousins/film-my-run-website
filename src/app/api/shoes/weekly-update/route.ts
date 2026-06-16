import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  parseShoeQuery,
  fetchReviewsForShoe,
  findImageForShoe,
  shoeToSlug,
} from '@/lib/shoe-enrichment';

const MAX_NEW_SHOES_PER_RUN = 10;
const STALE_DAYS = 30;
const MAX_STALE_REFRESH = 20;
const MAX_IMAGE_RETRY = 10;

interface DiscoveredShoe {
  brand: string;
  model: string;
}

async function discoverNewShoes(): Promise<DiscoveredShoe[]> {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY!;
  const anthropicKey = process.env.ANTHROPIC_API_KEY!;

  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();

  const queries = [
    `best new running shoes ${month} ${year}`,
    `new trail running shoes ${year}`,
    `new road running shoes ${year}`,
    `running shoe releases ${month} ${year}`,
  ];

  const allSnippets: string[] = [];

  for (const query of queries) {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&search_lang=en`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': braveKey },
    });
    if (res.ok) {
      const data = await res.json();
      const results = data.web?.results ?? [];
      for (const r of results) {
        allSnippets.push(`${r.title ?? ''}\n${r.description ?? ''}`);
      }
    }
    await sleep(1100);
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Extract all specific running shoe models mentioned in these search results. Only include shoes where you can identify both the brand and the specific model name (including version number).

Search results:
${allSnippets.slice(0, 20).join('\n---\n')}

Reply with ONLY a JSON array of objects, no markdown:
[{"brand": "Brand Name", "model": "Model Name With Version"}]

Rules:
- Include version numbers (e.g., "Clifton 10" not just "Clifton")
- Only include real, specific running shoe models
- Capitalize brand and model names properly
- No duplicates`,
    }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

async function addNewShoe(brand: string, model: string): Promise<{ added: boolean; reason: string }> {
  const slug = shoeToSlug(brand, model);
  const existing = await prisma.shoes.findUnique({ where: { slug } });
  if (existing) return { added: false, reason: 'already exists' };

  try {
    const parsed = await parseShoeQuery(`${brand} ${model}`);

    const shoe = await prisma.shoes.create({
      data: {
        brand: parsed.brand,
        model: parsed.model,
        slug: shoeToSlug(parsed.brand, parsed.model),
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
          where: { shoe_id_source: { shoe_id: shoe.id, source: review.source } },
          update: {
            source_url: review.source_url,
            expert_score: review.expert_score,
            summary: review.summary,
            fetched_at: new Date(),
          },
          create: {
            shoe_id: shoe.id,
            source: review.source,
            source_url: review.source_url,
            expert_score: review.expert_score,
            summary: review.summary,
          },
        });
      }
      const scores = reviews.map(r => r.expert_score);
      const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      await prisma.shoes.update({
        where: { id: shoe.id },
        data: { avg_score: avgScore, review_count: reviews.length, last_reviewed: new Date() },
      });
    }

    const imageResult = await findImageForShoe(parsed.brand, parsed.model);
    if (imageResult) {
      await prisma.shoes.update({
        where: { id: shoe.id },
        data: { image_url: imageResult.url },
      });
    }

    return { added: true, reason: `${reviews.length} reviews, ${imageResult ? 'image found' : 'no image'}` };
  } catch (err) {
    return { added: false, reason: err instanceof Error ? err.message : 'unknown error' };
  }
}

async function refreshStaleReviews(): Promise<{ refreshed: number; updated: number }> {
  const staleDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const staleShoes = await prisma.shoes.findMany({
    where: {
      OR: [
        { last_reviewed: null },
        { last_reviewed: { lt: staleDate } },
      ],
    },
    orderBy: { last_reviewed: 'asc' },
    take: MAX_STALE_REFRESH,
  });

  let updated = 0;
  for (const shoe of staleShoes) {
    try {
      const reviews = await fetchReviewsForShoe(shoe.brand, shoe.model);
      if (reviews.length > 0) {
        for (const review of reviews) {
          await prisma.shoe_reviews.upsert({
            where: { shoe_id_source: { shoe_id: shoe.id, source: review.source } },
            update: {
              source_url: review.source_url,
              expert_score: review.expert_score,
              summary: review.summary,
              fetched_at: new Date(),
            },
            create: {
              shoe_id: shoe.id,
              source: review.source,
              source_url: review.source_url,
              expert_score: review.expert_score,
              summary: review.summary,
            },
          });
        }

        const allReviews = await prisma.shoe_reviews.findMany({ where: { shoe_id: shoe.id } });
        const scores = allReviews
          .map(r => r.expert_score ? Number(r.expert_score) : null)
          .filter((s): s is number => s !== null);
        const avgScore = scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;

        await prisma.shoes.update({
          where: { id: shoe.id },
          data: {
            avg_score: avgScore,
            review_count: allReviews.length,
            last_reviewed: new Date(),
          },
        });
        updated++;
      } else {
        await prisma.shoes.update({
          where: { id: shoe.id },
          data: { last_reviewed: new Date() },
        });
      }
    } catch {
      // skip this shoe, continue with others
    }
  }

  return { refreshed: staleShoes.length, updated };
}

async function retryMissingImages(): Promise<{ attempted: number; found: number }> {
  const shoesWithoutImages = await prisma.shoes.findMany({
    where: { image_url: null },
    take: MAX_IMAGE_RETRY,
  });

  let found = 0;
  for (const shoe of shoesWithoutImages) {
    try {
      const imageResult = await findImageForShoe(shoe.brand, shoe.model);
      if (imageResult) {
        await prisma.shoes.update({
          where: { id: shoe.id },
          data: { image_url: imageResult.url },
        });
        found++;
      }
    } catch {
      // skip, continue
    }
  }

  return { attempted: shoesWithoutImages.length, found };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.BRAVE_SEARCH_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'API keys not configured' }, { status: 503 });
  }

  const log: string[] = [];
  const startTime = Date.now();

  try {
    // Phase 1: Discover new shoes
    log.push('Starting shoe discovery...');
    const discovered = await discoverNewShoes();
    log.push(`Found ${discovered.length} shoe mentions in search results`);

    let added = 0;
    for (const shoe of discovered) {
      if (added >= MAX_NEW_SHOES_PER_RUN) {
        log.push(`Hit max new shoes limit (${MAX_NEW_SHOES_PER_RUN})`);
        break;
      }
      const result = await addNewShoe(shoe.brand, shoe.model);
      if (result.added) {
        log.push(`+ Added: ${shoe.brand} ${shoe.model} (${result.reason})`);
        added++;
      } else {
        log.push(`  Skipped: ${shoe.brand} ${shoe.model} (${result.reason})`);
      }
    }
    log.push(`Discovery complete: ${added} new shoes added`);

    // Phase 2: Refresh stale reviews
    log.push('Refreshing stale reviews...');
    const reviewResult = await refreshStaleReviews();
    log.push(`Reviews: checked ${reviewResult.refreshed} stale shoes, ${reviewResult.updated} had new/updated reviews`);

    // Phase 3: Retry missing images
    log.push('Retrying missing images...');
    const imageResult = await retryMissingImages();
    log.push(`Images: attempted ${imageResult.attempted}, found ${imageResult.found} new images`);

    const duration = Math.round((Date.now() - startTime) / 1000);
    log.push(`Completed in ${duration}s`);

    return Response.json({
      success: true,
      summary: {
        newShoesAdded: added,
        reviewsRefreshed: reviewResult.updated,
        imagesFound: imageResult.found,
        durationSeconds: duration,
      },
      log,
    });
  } catch (err) {
    log.push(`Error: ${err instanceof Error ? err.message : 'unknown'}`);
    return Response.json({ success: false, log }, { status: 500 });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
