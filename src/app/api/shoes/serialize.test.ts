import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { serializeReview, serializeShoe } from './serialize';

describe('serializeShoe', () => {
  it('maps catalogue columns to camelCase with numeric scores and the superseding slug', () => {
    const out = serializeShoe({
      id: 1, brand: 'Hoka', model: 'Clifton 9', slug: 'hoka-clifton-9', terrain: 'road', category: 'daily_trainer',
      drop_mm: 5, weight_g: 248, stack_height_mm: 32, price_gbp: 13000, release_year: 2023, description: null,
      image_url: null, buy_url: null, avg_score: new Prisma.Decimal('8.75'), review_count: 4,
      user_avg_score: null, user_rating_count: 0, last_reviewed: null, superseded_by: { slug: 'hoka-clifton-10' },
    });
    expect(out).toMatchObject({ avgScore: 8.75, userAvgScore: null, supersededBySlug: 'hoka-clifton-10', priceGbp: 13000 });
    expect(out).not.toHaveProperty('reviews');
  });
});

describe('serializeReview', () => {
  it('keeps the field names the iPhone app decodes', () => {
    const out = serializeReview({
      source: 'runrepeat', source_url: 'https://runrepeat.com/x', expert_score: new Prisma.Decimal('9.1'),
      user_score: null, user_count: 12, summary: 'Soft.',
    });
    expect(out).toEqual({ source: 'runrepeat', sourceUrl: 'https://runrepeat.com/x', expertScore: 9.1, userScore: null, userCount: 12, summary: 'Soft.' });
  });
});
