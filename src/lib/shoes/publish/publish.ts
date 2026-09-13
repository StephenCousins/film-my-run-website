import { prisma } from '@/lib/db';
import type { ShoeCategory, ShoeOrigin, ShoeTerrain } from '@prisma/client';
import { recomputeShoeScore } from '../scores';
import { isSameLine, parseModelVersion } from '../versions';
import type { ReviewResult } from '../reviews';
import type { CandidateInput, GatePass } from './gate';

export interface NewShoe {
  brand: string;
  brand_id: number;
  model: string;
  slug: string;
  terrain: ShoeTerrain;
  category: ShoeCategory;
  description: string | null;
  drop_mm: number | null;
  weight_g: number | null;
  stack_height_mm: number | null;
  price_gbp: number | null;
  release_year: number | null;
  release_date: Date | null;
  origin: ShoeOrigin;
  added_by_user_id: number | null;
}

export interface PublishOrigin { kind: 'user'; userId: number }

export interface PublishDeps {
  createShoe: (data: NewShoe) => Promise<{ id: number }>;
  upsertReview: (shoeId: number, review: ReviewResult) => Promise<void>;
  recomputeShoeScore: (shoeId: number) => Promise<unknown>;
  markReviewed: (shoeId: number) => Promise<void>;
  /** Shoes of this brand not yet superseded, excluding the new one. */
  currentShoesOfBrand: (brandId: number, excludeId: number) => Promise<{ id: number; model: string; slug: string }[]>;
  supersede: (shoeId: number, byId: number) => Promise<void>;
  markCandidatePublished: (candidateId: number, shoeId: number) => Promise<void>;
}

const liveDeps: PublishDeps = {
  createShoe: async data => prisma.shoes.create({ data, select: { id: true } }),
  upsertReview: async (shoeId, review) => {
    await prisma.shoe_reviews.upsert({
      where: { shoe_id_source: { shoe_id: shoeId, source: review.source } },
      update: { source_url: review.source_url, expert_score: review.expert_score, summary: review.summary, fetched_at: new Date() },
      create: { shoe_id: shoeId, source: review.source, source_url: review.source_url, expert_score: review.expert_score, summary: review.summary },
    });
  },
  recomputeShoeScore: shoeId => recomputeShoeScore(shoeId),
  markReviewed: async shoeId => { await prisma.shoes.update({ where: { id: shoeId }, data: { last_reviewed: new Date() } }); },
  currentShoesOfBrand: async (brandId, excludeId) =>
    prisma.shoes.findMany({ where: { brand_id: brandId, superseded_by_id: null, id: { not: excludeId } }, select: { id: true, model: true, slug: true } }),
  supersede: async (shoeId, byId) => { await prisma.shoes.update({ where: { id: shoeId }, data: { superseded_by_id: byId } }); },
  markCandidatePublished: async (candidateId, shoeId) => {
    await prisma.shoe_candidates.update({ where: { id: candidateId }, data: { status: 'published', shoe_id: shoeId, decided_at: new Date() } });
  },
};

/**
 * The same line's highest version below the new one. Only that shoe is
 * superseded: older versions already point at it (or were never in the
 * catalogue), and a higher version in the catalogue means this is a
 * back-fill, not a replacement.
 */
export function findShoeToSupersede<T extends { model: string }>(model: string, existing: T[]): T | null {
  const newVersion = parseModelVersion(model).versionNum ?? 0;
  let best: { shoe: T; version: number } | null = null;
  for (const shoe of existing) {
    if (!isSameLine(shoe.model, model)) continue;
    const version = parseModelVersion(shoe.model).versionNum ?? 0;
    if (version >= newVersion) continue;
    if (!best || version > best.version) best = { shoe, version };
  }
  return best?.shoe ?? null;
}

/**
 * Turn a passed candidate into a catalogue shoe. A user suggestion has no
 * candidate row (`c.id === 0`) and is stamped with who added it; everything
 * else is `discovery` and closes its candidate.
 */
export async function publishCandidate(
  c: CandidateInput,
  pass: GatePass,
  deps: PublishDeps = liveDeps,
  origin?: PublishOrigin,
): Promise<{ shoeId: number; slug: string; supersededSlug: string | null }> {
  if (!c.brand) throw new Error('brand_unresolved');
  const { specs, reviews, releaseDate } = pass;

  const shoe = await deps.createShoe({
    brand: c.brand.name,
    brand_id: c.brand.id,
    model: c.model,
    slug: c.slug,
    terrain: specs.terrain,
    category: specs.category,
    description: specs.description,
    drop_mm: specs.drop_mm,
    weight_g: specs.weight_g,
    stack_height_mm: specs.stack_height_mm,
    price_gbp: specs.price_gbp,
    release_year: specs.release_year ?? releaseDate?.getFullYear() ?? null,
    release_date: releaseDate,
    origin: origin ? 'user' : 'discovery',
    added_by_user_id: origin?.userId ?? null,
  });

  for (const review of reviews) await deps.upsertReview(shoe.id, review);
  await deps.recomputeShoeScore(shoe.id);
  await deps.markReviewed(shoe.id);

  const previous = findShoeToSupersede(c.model, await deps.currentShoesOfBrand(c.brand.id, shoe.id));
  if (previous) await deps.supersede(previous.id, shoe.id);

  if (c.id !== 0) await deps.markCandidatePublished(c.id, shoe.id);

  return { shoeId: shoe.id, slug: c.slug, supersededSlug: previous?.slug ?? null };
}
