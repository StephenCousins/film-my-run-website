import { describe, expect, it, vi } from 'vitest';
import { refreshUtmbIndexes } from './refresh';

describe('the weekly UTMB refresh', () => {
  it('updates the index and its date, keeps a runner UTMB no longer shows, and never nulls a known index on a failed read', async () => {
    const update = vi.fn(async () => {});
    const out = await refreshUtmbIndexes({
      runners: async () => [
        { slug: 'a', utmb_uri: '1.a', utmb_index: 900 },
        { slug: 'b', utmb_uri: '2.b', utmb_index: 800 },
        { slug: 'c', utmb_uri: '3.c', utmb_index: 700 },
      ],
      read: async (uri) => (uri === '1.a' ? { index: 910 } : uri === '2.b' ? { index: null } : null),
      update,
      now: new Date('2026-09-28T00:00:00Z'),
    });
    expect(update).toHaveBeenCalledWith('a', 910, new Date('2026-09-28T00:00:00Z'));
    expect(update).toHaveBeenCalledWith('b', null, new Date('2026-09-28T00:00:00Z'));
    expect(update).toHaveBeenCalledTimes(2);
    expect(out).toEqual({ updated: 2, missing: ['c'] });
  });
});
