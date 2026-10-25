import { describe, it, expect } from 'vitest';
import { buildShoeQuery, rankByWeightedScore } from './query';

const q = (s: string) => buildShoeQuery(new URLSearchParams(s));

describe('buildShoeQuery', () => {
  it('defaults: current shoes only, by score', () => {
    expect(q('')).toEqual({
      where: { superseded_by_id: null },
      orderBy: [{ avg_score: { sort: 'desc', nulls: 'last' } }, { review_count: 'desc' }],
    });
  });
  it('terrain includes both', () => {
    expect(q('terrain=trail').where).toMatchObject({ AND: [{ OR: [{ terrain: 'trail' }, { terrain: 'both' }] }] });
  });
  it('ignores an invalid category', () => {
    expect(q('category=banana').where).not.toHaveProperty('category');
  });
  it('user_rating sorts in SQL', () => {
    expect(q('sort=user_rating').orderBy[0]).toEqual({ user_avg_score: { sort: 'desc', nulls: 'last' } });
  });
  it('includeSuperseded lifts the default filter', () => {
    expect(q('includeSuperseded=1').where).not.toHaveProperty('superseded_by_id');
  });
});

describe('rankByWeightedScore (UI sweep X2)', () => {
  const shoe = (id: number, avgScore: number | null, reviewCount: number) =>
    ({ id, avgScore, reviewCount, userAvgScore: null, userRatingCount: 0 });

  it('puts a well-reviewed 9 above a single 10, and unrated shoes last', () => {
    const rows = [shoe(1, 10, 1), shoe(2, null, 0), shoe(3, 9, 12), shoe(4, 8, 3)];
    // C = 8: shoe 1 = (10 + 40) / 6 = 8.33; shoe 3 = (108 + 40) / 17 = 8.71; shoe 4 = 8
    expect(rankByWeightedScore(rows, 'score', 8).map(s => s.id)).toEqual([3, 1, 4, 2]);
  });

  it('leaves the order alone when nothing in the catalogue is rated', () => {
    const rows = [shoe(1, null, 0), shoe(2, null, 0)];
    expect(rankByWeightedScore(rows, 'score', null)).toBe(rows);
  });
});
