import { describe, expect, it, vi } from 'vitest';
import { autoProfiles } from './auto';
import type { RunnerFile } from './types';

const file = (name: string): RunnerFile => ({
  slug: name.toLowerCase().replace(/ /g, '-'), name, aliases: [], nationality: 'GB', sex: 'F', birthYear: null, disciplines: ['trail_ultra'], era: 'current',
  utmb: { id: 1, uri: '1.x', index: 800, website: null },
  texts: [{ source: { name: 'UTMB', url: 'https://utmb.world/en/runner/1.x' }, text: `${name}. General UTMB Index: 800. 2025: Lakeland 100, 1st woman.` }],
  results: [{ race: 'Lakeland 100', year: 2025, distance: '169 km', time: '28:10:00', position: '1st woman', source: 'UTMB' }], photoCandidates: [],
});
const bio = ['She is a British trail runner.', 'She won the Lakeland 100 in 2025.', 'Her UTMB Index is 800.'];

function deps(over: object = {}) {
  return {
    known: async () => new Set(['Existing Runner']),
    gather: vi.fn(async (name: string) => (name === 'Nobody Found' ? null : file(name))),
    write: vi.fn(async () => ({ bio, costUsd: 0.05 })),
    check: vi.fn(async () => ({ unsupported: [] as string[], costUsd: 0.03 })),
    edit: vi.fn(async (_f: RunnerFile, b: string[]) => ({ bio: b, costUsd: 0.02 })),
    save: vi.fn(async (f: RunnerFile) => ({ slug: f.slug })),
    ...over,
  };
}

describe('automatic runner pages', () => {
  it('writes, checks and publishes a page for each new name, skipping known ones', async () => {
    const d = deps();
    const out = await autoProfiles(['Existing Runner', 'Jasmin Paris'], 10, d);
    expect(out.log).toEqual([{ name: 'Jasmin Paris', slug: 'jasmin-paris' }]);
    expect(d.save).toHaveBeenCalledTimes(1);
    const saved = d.save.mock.calls[0][0] as RunnerFile;
    expect(saved.bio).toEqual(bio);
    expect(saved.bestFinishes).toEqual(saved.results);
    expect(saved.photos).toEqual([]); // auto pages start with the card
    expect(saved.sources).toEqual([{ name: 'UTMB', url: 'https://utmb.world/en/runner/1.x' }]);
  });
  it('no results anywhere: no page, with the reason', async () => {
    const out = await autoProfiles(['Nobody Found'], 10, deps());
    expect(out.log).toEqual([{ name: 'Nobody Found', reason: 'no UTMB entry or Wikipedia article' }]);
  });
  it('at most 3 a day, and none past the budget', async () => {
    const d = deps();
    const out = await autoProfiles(['A One', 'B Two', 'C Three', 'D Four'], 10, d);
    expect(d.save).toHaveBeenCalledTimes(3);
    expect(out.log[3]).toEqual({ name: 'D Four', reason: 'over the 3-a-day limit' });
    const broke = await autoProfiles(['E Five'], 0.01, deps());
    expect(broke.log).toEqual([{ name: 'E Five', reason: 'monthly ceiling' }]);
  });
  it('an unsupported fact is edited out; still unsupported after every round, it is marked, not published bare', async () => {
    const check = vi.fn().mockResolvedValueOnce({ unsupported: ['Her UTMB Index is 800'], costUsd: 0 }).mockResolvedValue({ unsupported: [], costUsd: 0 });
    const d = deps({ check });
    await autoProfiles(['Jasmin Paris'], 10, d);
    expect(d.edit).toHaveBeenCalledWith(expect.anything(), bio, { unsupported: ['Her UTMB Index is 800'] });
    expect(d.save).toHaveBeenCalledTimes(1);
  });
  it('a writer that returns nothing: no page, with the reason', async () => {
    const out = await autoProfiles(['Jasmin Paris'], 10, deps({ write: async () => ({ bio: null, costUsd: 0.05 }) }));
    expect(out.log).toEqual([{ name: 'Jasmin Paris', reason: 'the writer returned nothing' }]);
  });
});
