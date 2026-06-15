import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  parseShoeQuery,
  fetchReviewsForShoe,
  findImageForShoe,
  shoeToSlug,
} from '@/lib/shoe-enrichment';

function streamLine(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Sign in required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = parseInt(session.user.id);

  const body = await req.json().catch(() => null);
  const query = body?.query?.trim();
  if (!query || query.length < 3 || query.length > 100) {
    return new Response(JSON.stringify({ error: 'Please enter a shoe name (3-100 characters)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit: 5 additions per user per day
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.shoes.count({
    where: {
      created_at: { gte: dayAgo },
      description: { contains: `[added by user ${userId}]` },
    },
  });
  if (recentCount >= 5) {
    return new Response(JSON.stringify({ error: 'Daily limit reached (5 shoes per day). Try again tomorrow.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Parse shoe details
        streamLine(controller, { step: 'parsing', message: 'Looking up shoe details...' });

        const parsed = await parseShoeQuery(query);
        streamLine(controller, {
          step: 'parsed',
          message: `Found: ${parsed.brand} ${parsed.model} (${parsed.terrain} ${parsed.category.replace(/_/g, ' ')})`,
          brand: parsed.brand,
          model: parsed.model,
        });

        // Step 2: Check for duplicates
        const slug = shoeToSlug(parsed.brand, parsed.model);
        const existing = await prisma.shoes.findUnique({ where: { slug } });
        if (existing) {
          streamLine(controller, {
            step: 'duplicate',
            message: `${parsed.brand} ${parsed.model} is already in our database`,
            slug,
          });
          controller.close();
          return;
        }

        // Step 3: Create shoe record
        streamLine(controller, { step: 'creating', message: 'Adding to database...' });

        const shoe = await prisma.shoes.create({
          data: {
            brand: parsed.brand,
            model: parsed.model,
            slug,
            terrain: parsed.terrain,
            category: parsed.category,
            drop_mm: parsed.drop_mm,
            weight_g: parsed.weight_g,
            stack_height_mm: parsed.stack_height_mm,
            price_gbp: parsed.price_gbp,
            release_year: parsed.release_year,
            description: parsed.description ? `${parsed.description} [added by user ${userId}]` : `[added by user ${userId}]`,
          },
        });

        // Step 4: Fetch reviews
        streamLine(controller, { step: 'reviews', message: 'Fetching reviews...' });

        const reviews = await fetchReviewsForShoe(parsed.brand, parsed.model);
        let avgScore: number | null = null;

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
          avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

          await prisma.shoes.update({
            where: { id: shoe.id },
            data: {
              avg_score: avgScore,
              review_count: reviews.length,
              last_reviewed: new Date(),
            },
          });

          streamLine(controller, {
            step: 'reviews_done',
            message: `Found ${reviews.length} review(s), avg score: ${avgScore}/10`,
          });
        } else {
          streamLine(controller, { step: 'reviews_done', message: 'No reviews found yet' });
        }

        // Step 5: Find image
        streamLine(controller, { step: 'image', message: 'Finding product image...' });

        const imageResult = await findImageForShoe(parsed.brand, parsed.model);
        let imageUrl: string | null = null;

        if (imageResult) {
          imageUrl = imageResult.url;
          await prisma.shoes.update({
            where: { id: shoe.id },
            data: { image_url: imageUrl },
          });
          streamLine(controller, {
            step: 'image_done',
            message: `Image found (${imageResult.method})`,
          });
        } else {
          streamLine(controller, { step: 'image_done', message: 'No image found' });
        }

        // Step 6: Return complete shoe
        streamLine(controller, {
          step: 'complete',
          message: 'Shoe added successfully!',
          shoe: {
            id: shoe.id,
            brand: parsed.brand,
            model: parsed.model,
            slug,
            terrain: parsed.terrain,
            category: parsed.category,
            dropMm: parsed.drop_mm,
            weightG: parsed.weight_g,
            stackHeightMm: parsed.stack_height_mm,
            priceGbp: parsed.price_gbp,
            releaseYear: parsed.release_year,
            description: parsed.description,
            imageUrl,
            avgScore,
            reviewCount: reviews.length,
          },
        });
      } catch (err) {
        streamLine(controller, {
          step: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong',
        });
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
