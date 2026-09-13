import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loadBrands, resolveBrand } from '@/lib/shoes/brands';
import { shoeToSlug } from '@/lib/shoes/slug';
import { isSameLine, parseModelVersion } from '@/lib/shoes/versions';
import { parseUserQuery } from '@/lib/shoes/parseUserQuery';
import { evaluate, type CandidateInput } from '@/lib/shoes/publish/gate';
import { publishCandidate } from '@/lib/shoes/publish/publish';
import { findAndStoreImage } from '@/lib/shoes/images';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const DAILY_LIMIT = 5;
const ATTEMPT_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// Attempts, not just publishes: a held or duplicate suggestion still costs
// searches and LLM calls. Per process, so a deploy resets it; that is fine.
const attempts = new Map<number, { count: number; resetAt: number }>();

function overAttemptLimit(userId: number): boolean {
  const now = Date.now();
  const a = attempts.get(userId);
  if (!a || a.resetAt <= now) { attempts.set(userId, { count: 1, resetAt: now + DAY_MS }); return false; }
  a.count++;
  return a.count > ATTEMPT_LIMIT;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function streamLine(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'));
}

/**
 * Suggest-a-Shoe. A signed-in visitor's free text goes through the same gate
 * as a discovered candidate (brand page, reviews, specs), with the two
 * judgement holds overridden: a visitor asking for an older shoe with one
 * review is a visitor who wants that shoe. The modal reads NDJSON lines
 * `{ step, message, ... }`; `complete` carries the shoe, `duplicate` and
 * `error` end the stream.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ error: 'Sign in required' }, 401);
  const userId = parseInt(session.user.id);

  if (!process.env.OPENROUTER_API_KEY || (!process.env.BRAVE_SEARCH_API_KEY && !process.env.SERPER_API_KEY)) {
    return json({ error: 'Shoe suggestion service is not configured' }, 503);
  }

  const body = await req.json().catch(() => null);
  const query: string | undefined = typeof body?.query === 'string' ? body.query.trim() : undefined;
  if (!query || query.length < 3 || query.length > 100) return json({ error: 'Please enter a shoe name (3-100 characters)' }, 400);

  const dayAgo = new Date(Date.now() - DAY_MS);
  const recentCount = await prisma.shoes.count({ where: { added_by_user_id: userId, created_at: { gte: dayAgo } } });
  if (recentCount >= DAILY_LIMIT) return json({ error: `Daily limit reached (${DAILY_LIMIT} shoes per day). Try again tomorrow.` }, 429);
  if (overAttemptLimit(userId)) return json({ error: 'Too many suggestions today. Try again tomorrow.' }, 429);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        streamLine(controller, { step: 'parsing', message: 'Working out which shoe you mean...' });
        const parsed = await parseUserQuery(query);
        const brand = resolveBrand(parsed.brand, await loadBrands());
        if (!brand) {
          streamLine(controller, { step: 'error', message: `We don't know the brand "${parsed.brand}" yet. Email stephen@filmmyrun.com and we'll add it.` });
          return;
        }
        const model = parsed.model;
        const slug = shoeToSlug(brand.name, model);
        streamLine(controller, { step: 'parsed', message: `Found: ${brand.name} ${model}`, brand: brand.name, model });

        // Same duplicate rule as discovery: the slug, or the same line at the same version.
        const version = parseModelVersion(model).versionNum;
        const existing = await prisma.shoes.findUnique({ where: { slug }, select: { slug: true } })
          ?? (await prisma.shoes.findMany({ where: { brand_id: brand.id }, select: { slug: true, model: true } }))
            .find(s => isSameLine(s.model, model) && parseModelVersion(s.model).versionNum === version);
        if (existing) {
          streamLine(controller, { step: 'duplicate', message: `${brand.name} ${model} is already in our database`, slug: existing.slug });
          return;
        }

        streamLine(controller, { step: 'reviews', message: `Checking ${brand.domain} and fetching reviews...` });
        const input: CandidateInput = { id: 0, slug, brand, model, evidence: { sources: [] } };
        const gate = await evaluate(input, undefined, { override: ['too_old', 'reviews_lt_2'] });
        if (!gate.publish) {
          const message = gate.reasons.includes('no_brand_page')
            ? `Couldn't find the "${brand.name} ${model}" on ${brand.domain}, so it wasn't added`
            : `Couldn't add ${brand.name} ${model}: ${gate.reasons.join(', ')}`;
          streamLine(controller, { step: 'error', message });
          return;
        }

        streamLine(controller, { step: 'creating', message: 'Adding to database...' });
        const published = await publishCandidate(input, gate, { kind: 'user', userId });
        streamLine(controller, {
          step: 'reviews_done',
          message: gate.reviews.length ? `Found ${gate.reviews.length} review${gate.reviews.length === 1 ? '' : 's'}` : 'No reviews found yet',
        });

        streamLine(controller, { step: 'image', message: 'Finding product image...' });
        // The shoe is published from here on; an image failure is logged, never streamed as an error.
        let image: Awaited<ReturnType<typeof findAndStoreImage>> = null;
        try {
          image = await findAndStoreImage({ slug: published.slug, brand, model }, gate.brandPage);
        } catch (err) {
          console.error(`Shoe image failed after publishing ${published.slug}`, err);
        }
        streamLine(controller, { step: 'image_done', message: image ? `Image found (${image.method})` : 'No image found' });

        const shoe = await prisma.shoes.findUniqueOrThrow({ where: { id: published.shoeId } });
        streamLine(controller, {
          step: 'complete',
          message: 'Shoe added successfully!',
          shoe: {
            id: shoe.id,
            brand: shoe.brand,
            model: shoe.model,
            slug: shoe.slug,
            terrain: shoe.terrain,
            category: shoe.category,
            dropMm: shoe.drop_mm,
            weightG: shoe.weight_g,
            stackHeightMm: shoe.stack_height_mm,
            priceGbp: shoe.price_gbp,
            releaseYear: shoe.release_year,
            description: shoe.description,
            imageUrl: shoe.image_url,
            avgScore: shoe.avg_score === null ? null : Number(shoe.avg_score),
            reviewCount: shoe.review_count,
          },
        });
      } catch (err) {
        console.error('Shoe suggestion failed', err);
        streamLine(controller, { step: 'error', message: err instanceof Error ? err.message : 'Something went wrong' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
