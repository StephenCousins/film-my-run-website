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

  it('a deadline of 0 stops before checking anyone and reports what was not checked', async () => {
    const read = vi.fn(async () => ({ index: 1 }));
    const update = vi.fn(async () => {});
    const out = await refreshUtmbIndexes({
      runners: async () => [
        { slug: 'a', utmb_uri: '1.a', utmb_index: 900 },
        { slug: 'b', utmb_uri: '2.b', utmb_index: 800 },
        { slug: 'c', utmb_uri: '3.c', utmb_index: 700 },
      ],
      read,
      update,
      now: new Date('2026-09-28T00:00:00Z'),
      deadlineMs: 0,
    });
    expect(read).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(out).toEqual({ updated: 0, missing: [], cutShort: 3 });
  });

  it('every page we could read losing its index, when some runner had one before, is treated as UTMB changing shape: nothing is written', async () => {
    const update = vi.fn(async () => {});
    const out = await refreshUtmbIndexes({
      runners: async () => [
        { slug: 'a', utmb_uri: '1.a', utmb_index: 900 },
        { slug: 'b', utmb_uri: '2.b', utmb_index: 800 },
      ],
      read: async () => ({ index: null }),
      update,
      now: new Date('2026-09-28T00:00:00Z'),
    });
    expect(update).not.toHaveBeenCalled();
    expect(out).toEqual({ updated: 0, missing: [], note: 'UTMB pages no longer show an index; nothing changed' });
  });

  it('stores the full results newest first and adds a new podium; a page with no results keeps the stored ones', async () => {
    const f = (race: string, date: string, position: string) => ({ race, year: Number(date.slice(0, 4)), distance: null, time: '10:00:00', position, source: 'UTMB', date });
    const saveResults = vi.fn(async () => {});
    const out = await refreshUtmbIndexes({
      runners: async () => [
        { slug: 'a', utmb_uri: '1.a', utmb_index: 900, best_finishes: [], sources: [{ name: 'UTMB', url: 'u' }], bio_checked_at: new Date('2026-09-01') },
        { slug: 'b', utmb_uri: '2.b', utmb_index: 800, best_finishes: [], sources: [], bio_checked_at: null },
      ],
      read: async (uri) => (uri === '1.a' ? { index: 910, results: [f('Old', '2025-07-01', '5th man'), f('Won', '2026-10-18', '1st man')] } : { index: 801, results: [] }),
      update: async () => {},
      saveResults,
      now: new Date('2026-10-20T00:00:00Z'),
    });
    expect(saveResults).toHaveBeenCalledTimes(1);
    const [slug, u] = saveResults.mock.calls[0] as unknown as [string, { results: { race: string }[]; finishes: { race: string }[] }];
    expect(slug).toBe('a');
    expect(u.results.map((r) => r.race)).toEqual(['Won', 'Old']);
    expect(u.finishes.map((r) => r.race)).toEqual(['Won']);
    expect(out.podiums).toBe(1);
  });
});
