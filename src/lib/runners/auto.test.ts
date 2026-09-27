import { describe, expect, it, vi } from 'vitest';
import { autoProfiles, recentFailureNames } from './auto';
import type { RunnerFile } from './types';
import { UNVERIFIED_NOTE } from '@/lib/news/write';

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
    slugTaken: vi.fn(async () => false),
    autoToday: vi.fn(async () => 0),
    recentFailures: vi.fn(async () => new Set<string>()),
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

  it('never overwrites an existing page: a taken slug is skipped after gather, before the writer', async () => {
    const slugTaken = vi.fn(async () => true);
    const d = deps({ slugTaken });
    const out = await autoProfiles(['Jasmin Paris'], 10, d);
    expect(out.log).toEqual([{ name: 'Jasmin Paris', reason: 'already has a page' }]);
    expect(d.gather).toHaveBeenCalledTimes(1);
    expect(slugTaken).toHaveBeenCalledWith('jasmin-paris');
    expect(d.write).not.toHaveBeenCalled();
    expect(d.save).not.toHaveBeenCalled();
  });

  it('still unhappy in the last round: edited with an asterisk and published with the unverified note', async () => {
    const markedBio = ['She is a British trail runner.', 'She won the Lakeland 100 in 2025.', 'Her UTMB Index is 800.*'];
    const check = vi.fn(async () => ({ unsupported: ['Her UTMB Index is 800'], costUsd: 0 }));
    const edit = vi.fn(async (_f: RunnerFile, b: string[], fix: { mark?: string[] }) => (fix.mark ? { bio: markedBio, costUsd: 0.02 } : { bio: b, costUsd: 0.02 }));
    const d = deps({ check, edit });
    const out = await autoProfiles(['Jasmin Paris'], 10, d);
    expect(out.log).toEqual([{ name: 'Jasmin Paris', slug: 'jasmin-paris' }]);
    expect(d.save).toHaveBeenCalledTimes(1);
    const saved = d.save.mock.calls[0][0] as RunnerFile;
    expect(saved.bio).toEqual([...markedBio, UNVERIFIED_NOTE]);
  });

  it('still unhappy in the last round and the marked draft still breaks a rule: not published', async () => {
    const brokenMarkedBio = ['She is a British trail runner.', 'She won the Lakeland 100 in 2025.']; // 2 paragraphs: still breaks the 3-5 rule
    const check = vi.fn(async () => ({ unsupported: ['Her UTMB Index is 800'], costUsd: 0 }));
    const edit = vi.fn(async (_f: RunnerFile, b: string[], fix: { mark?: string[] }) => (fix.mark ? { bio: brokenMarkedBio, costUsd: 0.02 } : { bio: b, costUsd: 0.02 }));
    const d = deps({ check, edit });
    const out = await autoProfiles(['Jasmin Paris'], 10, d);
    expect(out.log).toEqual([{ name: 'Jasmin Paris', reason: 'unsupported: Her UTMB Index is 800' }]);
    expect(d.save).not.toHaveBeenCalled();
  });

  it('a failed attempt still counts toward the day cap', async () => {
    const write = vi.fn(async () => ({ bio: null, costUsd: 0.05 }));
    const d = deps({ write });
    const out = await autoProfiles(['A One', 'B Two', 'C Three', 'D Four'], 10, d);
    expect(d.write).toHaveBeenCalledTimes(3);
    expect(out.log[3]).toEqual({ name: 'D Four', reason: 'over the 3-a-day limit' });
    expect(d.save).not.toHaveBeenCalled();
  });

  it('autoToday reduces how many more can be made this run', async () => {
    const d = deps({ autoToday: async () => 2 });
    const out = await autoProfiles(['A One', 'B Two'], 10, d);
    expect(d.save).toHaveBeenCalledTimes(1);
    expect(out.log[1]).toEqual({ name: 'B Two', reason: 'over the 3-a-day limit' });
  });

  it('stops starting new names after the deadline, without gathering them', async () => {
    const d = deps();
    const out = await autoProfiles(['A One', 'B Two'], 10, { ...d, clock: () => 0, deadlineMs: 0 });
    expect(out.log).toEqual([{ name: 'A One', reason: 'out of time' }, { name: 'B Two', reason: 'out of time' }]);
    expect(d.gather).not.toHaveBeenCalled();
  });

  it('two names resolving to the same person in one run: only the first is tried', async () => {
    const gather = vi.fn(async () => file('Jasmin Paris'));
    const d = deps({ gather });
    const out = await autoProfiles(['Jasmin Paris', 'J Paris'], 10, d);
    expect(out.log).toEqual([{ name: 'Jasmin Paris', slug: 'jasmin-paris' }, { name: 'J Paris', reason: 'same person, already handled this run' }]);
    expect(d.write).toHaveBeenCalledTimes(1);
  });

  it('a name that failed for a real reason in the last 14 days is not retried', async () => {
    const d = deps({ recentFailures: async () => new Set(['Jasmin Paris']) });
    const out = await autoProfiles(['Jasmin Paris'], 10, d);
    expect(out.log).toEqual([{ name: 'Jasmin Paris', reason: 'failed recently' }]);
    expect(d.gather).not.toHaveBeenCalled();
  });

  it('"failed recently" and a same-run duplicate are not themselves failures: a name whose only recent log entries are those gets attempted', () => {
    const names = recentFailureNames([
      [{ name: 'Jasmin Paris', reason: 'failed recently' }],
      [{ name: 'Jasmin Paris', reason: 'same person, already handled this run' }],
    ]);
    expect(names.has('Jasmin Paris')).toBe(false);
  });
});
