import type { Prisma } from '@prisma/client';
import { cardUrlFor } from '@/lib/shoes/images/store';

/** Catalogue columns only: no reviews, no per-user ratings, so the list is cacheable. */
export const shoeSelect = {
  id: true,
  brand: true,
  model: true,
  slug: true,
  terrain: true,
  category: true,
  drop_mm: true,
  weight_g: true,
  stack_height_mm: true,
  price_gbp: true,
  release_year: true,
  description: true,
  image_url: true,
  buy_url: true,
  avg_score: true,
  review_count: true,
  user_avg_score: true,
  user_rating_count: true,
  last_reviewed: true,
  superseded_by: { select: { slug: true } },
} satisfies Prisma.shoesSelect;

export type ShoeRow = Prisma.shoesGetPayload<{ select: typeof shoeSelect }>;

const num = (d: Prisma.Decimal | null) => (d === null ? null : parseFloat(d.toString()));

export function serializeShoe(s: ShoeRow) {
  return {
    id: s.id,
    brand: s.brand,
    model: s.model,
    slug: s.slug,
    terrain: s.terrain,
    category: s.category,
    dropMm: s.drop_mm,
    weightG: s.weight_g,
    stackHeightMm: s.stack_height_mm,
    priceGbp: s.price_gbp,
    releaseYear: s.release_year,
    description: s.description,
    imageUrl: s.image_url,
    cardImageUrl: cardUrlFor(s.image_url),
    buyUrl: s.buy_url,
    avgScore: num(s.avg_score),
    reviewCount: s.review_count,
    userAvgScore: num(s.user_avg_score),
    userRatingCount: s.user_rating_count,
    lastReviewed: s.last_reviewed,
    supersededBySlug: s.superseded_by?.slug ?? null,
  };
}

export const reviewSelect = {
  source: true,
  source_url: true,
  expert_score: true,
  user_score: true,
  user_count: true,
  summary: true,
} satisfies Prisma.shoe_reviewsSelect;

export type ReviewRow = Prisma.shoe_reviewsGetPayload<{ select: typeof reviewSelect }>;

export function serializeReview(r: ReviewRow) {
  return {
    source: r.source,
    sourceUrl: r.source_url,
    expertScore: num(r.expert_score),
    userScore: num(r.user_score),
    userCount: r.user_count,
    summary: r.summary,
  };
}
