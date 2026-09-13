import { describe, it, expect } from 'vitest';
import { extractExplicitScore, averageTo1dp, recomputeShoeScore } from './scores';

describe('extractExplicitScore', () => {
  it('reads x/10', () => expect(extractExplicitScore('Score: 9.2/10 overall')).toBe(9.2));
  it('doubles x/5', () => expect(extractExplicitScore('4.5 out of 5')).toBe(9));
  it('divides percentages', () => expect(extractExplicitScore('rated 87%')).toBe(8.7));
  it('doubles stars', () => expect(extractExplicitScore('4 stars')).toBe(8));
  it('returns null with nothing', () => expect(extractExplicitScore('great shoe')).toBeNull());
});

describe('averageTo1dp', () => {
  it('rounds to one decimal', () => expect(averageTo1dp([9, 8.25])).toBe(8.6));
  it('is null for empty', () => expect(averageTo1dp([])).toBeNull());
});

describe('recomputeShoeScore', () => {
  it('writes all four fields from the two score lists', async () => {
    const writes: unknown[] = [];
    const r = await recomputeShoeScore(7, {
      reviewScores: async () => [9, 8],
      userScores: async () => [7, 8, 9],
      write: async (_id, data) => { writes.push(data); },
    });
    expect(r).toEqual({ avgScore: 8.5, reviewCount: 2, userAvgScore: 8, userRatingCount: 3 });
    expect(writes[0]).toMatchObject({ avg_score: 8.5, review_count: 2, user_avg_score: 8, user_rating_count: 3 });
  });
  it('writes nulls when nothing is scored', async () => {
    const r = await recomputeShoeScore(7, {
      reviewScores: async () => [], userScores: async () => [], write: async () => {},
    });
    expect(r).toEqual({ avgScore: null, reviewCount: 0, userAvgScore: null, userRatingCount: 0 });
  });
});
