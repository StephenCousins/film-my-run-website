import { describe, it, expect } from 'vitest';
import { buildShoeQuery } from './query';

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
