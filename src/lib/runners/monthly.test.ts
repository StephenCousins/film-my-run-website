import { describe, expect, it, vi } from 'vitest';
import { profileProblems } from './checks';
import { addPodiums, MONTHLY_BIO_LIMIT, monthlyFailures, monthlyRefresh, type MonthlyDeps, type PageRow } from './monthly';
import type { BestFinish, RunnerFile } from './types';

const checked = new Date('2026-06-01T00:00:00Z');
const finish = (race: string, year: number, position: string | null, date = `${year}-07-01`): BestFinish => ({ race, year, distance: '100 km', time: '10:00:00', position, source: 'UTMB', date });
const r2Photo = { kind: 'portrait' as const, url: 'https://pub-x.r2.dev/runners/jane-doe-portrait.webp', credit: 'Photo: Jane Smith', licence: null, source_url: 'https://example.com/p' };

const row = (slug: string, over: Partial<PageRow> = {}): PageRow => ({
  slug, name: slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), aliases: [], nationality: 'GB', sex: 'F', birth_year: null,
  disciplines: ['trail_ultra'], era: 'current', bio: '<p>She is a runner.</p>\n<p>She won a race.</p>\n<p>She runs now.</p>',
  best_finishes: [], sources: [{ name: 'UTMB', url: `https://utmb.world/en/runner/1.${slug}` }], photos: [r2Photo],
  utmb_id: 1, utmb_uri: `1.${slug}`, utmb_index: 700, written_by: 'session', bio_checked_at: checked, ...over,
});

const gathered = (r: PageRow): RunnerFile => ({
  slug: 'different-slug', name: r.name, aliases: [], nationality: 'GB', sex: 'F', birthYear: null, disciplines: ['trail_ultra'], era: 'current',
  utmb: { id: 1, uri: r.utmb_uri!, index: 710, website: null, picture: null },
  texts: [{ source: { name: 'UTMB', url: `https://utmb.world/en/runner/${r.utmb_uri}` }, text: 'She is a runner. 2026: Lakeland 100, 1st woman.' }],
  results: [], photoCandidates: [],
});
const newBio = ['She is a British trail runner.', 'She won the Lakeland 100 in 2026.', 'She is racing again this year.'];

function deps(rows: PageRow[], over: Partial<MonthlyDeps> = {}) {
  return {
    runners: async () => rows,
    recentFailures: async () => new Set<string>(),
    latestNews: async () => new Map<string, Date>(),
    monthSpentUsd: async () => 0,
    gather: vi.fn(async (r: PageRow) => gathered(r)),
    write: vi.fn(async () => ({ bio: newBio, costUsd: 0.05 })),
    check: vi.fn(async () => ({ unsupported: [] as string[], costUsd: 0.03 })),
    edit: vi.fn(async (_f: RunnerFile, b: string[]) => ({ bio: b, costUsd: 0.02 })),
    save: vi.fn(async () => ({})),
    ...over,
  } satisfies MonthlyDeps;
}

describe('new podiums into best finishes (the weekly UTMB refresh)', () => {
  it('adds a new podium, not a duplicate, a non-podium or one from before the last check', () => {
    const have = [finish('Lakeland 100', 2026, '1st woman')];
    const p = addPodiums(row('jane-doe', { best_finishes: have }), [finish('Lakeland 100', 2026, '1st woman'), finish('Lavaredo', 2026, '2nd woman'), finish('Zegama', 2026, '4th woman'), finish('Old Race', 2026, '1st woman', '2026-03-01')]);
    expect(p?.added).toBe(1);
    expect(p?.finishes).toEqual([have[0], expect.objectContaining({ race: 'Lavaredo' })]);
    expect(p?.sources).toEqual(row('jane-doe').sources);
  });

  it('nothing new is null', () => {
    expect(addPodiums(row('jane-doe'), [finish('Zegama', 2026, '4th woman')])).toBeNull();
  });

  it('keeps at most 10, dropping only UTMB entries, lowest place then oldest first', () => {
    const have = [...Array.from({ length: 8 }, (_, i) => finish(`Race ${i}`, 2015 + i, '3rd woman')), { ...finish('Comrades', 2010, '9th woman'), source: 'Wikipedia' }, finish('Worse', 2024, '3rd woman')];
    const p = addPodiums(row('jane-doe', { best_finishes: have, sources: [{ name: 'UTMB', url: 'u' }, { name: 'Wikipedia', url: 'w' }] }), [finish('New Win', 2026, '1st woman')]);
    expect(p?.finishes).toHaveLength(10);
    expect(p?.added).toBe(1);
    expect(p?.finishes.map((b) => b.race)).toContain('New Win');
    expect(p?.finishes.map((b) => b.race)).toContain('Comrades'); // not from UTMB: never dropped, whatever its place
    expect(p?.finishes.map((b) => b.race)).not.toContain('Race 0');
  });

  it('adds the UTMB source when the page lacks one, and the page still passes the real checks', () => {
    const p = addPodiums(row('jane-doe', { sources: [{ name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Jane_Doe' }] }), [finish('Lavaredo', 2026, '2nd woman')])!;
    expect(p.sources).toEqual([{ name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Jane_Doe' }, { name: 'UTMB', url: 'https://utmb.world/en/runner/1.jane-doe' }]);
    const page: RunnerFile = { slug: 'jane-doe', name: 'Jane Doe', aliases: [], nationality: 'GB', sex: 'F', birthYear: null, disciplines: ['trail_ultra'], era: 'current', utmb: null, texts: [], results: [], photoCandidates: [], bio: newBio, bestFinishes: p.finishes, sources: p.sources, photos: [] };
    expect(profileProblems(page)).toEqual([]);
  });
});

describe('monthly runner refresh: which bios', () => {
  it('a new story or a podium since the last check selects; an older story or podium does not', async () => {
    const rows = [row('new-story'), row('old-story'), row('new-podium', { best_finishes: [finish('Lavaredo', 2026, '3rd')] }), row('old-podium', { best_finishes: [finish('Zegama', 2026, '1st', '2026-05-01')] }), row('nothing')];
    const d = deps(rows, {
      latestNews: async () => new Map([['new-story', new Date('2026-09-01')], ['old-story', new Date('2026-05-01')]]),
    });
    const s = await monthlyRefresh(d);
    expect(s.biosRefreshed).toEqual(['new-story', 'new-podium']);
  });

  it('at most 20, newest news first', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => row(`runner-${String.fromCharCode(97 + i)}`));
    const news = new Map(rows.map((r, i) => [r.slug, new Date(Date.UTC(2026, 7, 1 + i))]));
    const d = deps(rows, { latestNews: async () => news });
    const s = await monthlyRefresh(d);
    expect(s.biosRefreshed).toHaveLength(MONTHLY_BIO_LIMIT);
    expect(s.biosRefreshed[0]).toBe('runner-y');
  });
});

describe('monthly runner refresh: saving', () => {
  const news = async () => new Map([['jane-doe', new Date('2026-09-01')]]);

  it('keeps the page, its photos and its session author; bio and sources updated', async () => {
    const d = deps([row('jane-doe')], { latestNews: news });
    const s = await monthlyRefresh(d);
    expect(s.biosRefreshed).toEqual(['jane-doe']);
    const [f, by] = vi.mocked(d.save).mock.calls[0] as unknown as [RunnerFile, string];
    expect(by).toBe('session');
    expect(f.slug).toBe('jane-doe');
    expect(f.photos).toEqual([r2Photo]);
    expect(f.bio).toEqual(newBio);
    expect(f.sources!.map((x) => x.name)).toEqual(['UTMB']);
    expect(f).toMatchObject({ aliases: [], disciplines: ['trail_ultra'], era: 'current', nationality: 'GB', name: 'Jane Doe' });
    // The writer saw the old bio, labelled as our previous profile.
    const seen = (vi.mocked(d.write).mock.calls[0] as unknown as [RunnerFile, string[]]);
    expect(seen[1]).toEqual(['She is a runner.', 'She won a race.', 'She runs now.']);
    expect(seen[0].texts.map((t) => t.source.name)).toContain('Film My Run previous profile');
  });

  it('keeps aliases, disciplines, era and nationality; one Film My Run source, the newest', async () => {
    const r = row('jane-doe', { aliases: ['Jane D. Doe'], disciplines: ['road', 'trail_ultra'], era: 'historic', nationality: 'IE', sources: [{ name: 'UTMB', url: 'https://utmb.world/en/runner/1.jane-doe' }, { name: 'Film My Run', url: 'https://filmmyrun.com/news/old' }] });
    const g = gathered(r);
    g.texts.push({ source: { name: 'Film My Run', url: 'https://filmmyrun.com/news/new' }, text: 'Jane Doe won again.' });
    const d = deps([r], { latestNews: news, gather: vi.fn(async () => g) });
    await monthlyRefresh(d);
    const [f] = vi.mocked(d.save).mock.calls[0] as unknown as [RunnerFile];
    expect(f).toMatchObject({ aliases: ['Jane D. Doe'], disciplines: ['road', 'trail_ultra'], era: 'historic', nationality: 'IE' });
    expect(f.sources).toEqual([{ name: 'UTMB', url: 'https://utmb.world/en/runner/1.jane-doe' }, { name: 'Film My Run', url: 'https://filmmyrun.com/news/new' }]);
  });

  it('a bio that failed in the last 30 days is not tried again', async () => {
    const d = deps([row('jane-doe')], { latestNews: news, recentFailures: async () => monthlyFailures([{ monthlyRefresh: { skipped: [{ slug: 'jane-doe', reason: 'unsupported: x' }, { slug: 'ann-smith', reason: 'budget' }] } }]) });
    const s = await monthlyRefresh(d);
    expect(d.write).not.toHaveBeenCalled();
    expect(s.skipped).toEqual([{ slug: 'jane-doe', reason: 'failed recently' }]);
    expect(monthlyFailures([{ monthlyRefresh: { skipped: [{ slug: 'ann-smith', reason: 'budget' }] } }]).size).toBe(0);
  });

  it('spend from earlier rounds counts when a later call throws', async () => {
    const check = vi.fn().mockResolvedValueOnce({ unsupported: ['x'], costUsd: 0.03 }).mockRejectedValueOnce(new Error('network'));
    const d = deps([row('jane-doe')], { latestNews: news, check });
    const s = await monthlyRefresh(d);
    expect(s.costUsd).toBeCloseTo(0.05 + 0.03 + 0.02); // write, first check, the edit
    expect(s.skipped).toEqual([{ slug: 'jane-doe', reason: 'error: network' }]);
  });

  it('reports progress after every bio', async () => {
    const progress = vi.fn(async () => {});
    await monthlyRefresh(deps([row('jane-doe')], { latestNews: news, progress }));
    expect(progress).toHaveBeenCalledTimes(1);
  });

  it('an auto page stays auto', async () => {
    const d = deps([row('jane-doe', { written_by: 'auto' })], { latestNews: news });
    await monthlyRefresh(d);
    expect(vi.mocked(d.save).mock.calls[0][1]).toBe('auto');
  });

  it('a bio that fails the checks leaves the old one untouched', async () => {
    const d = deps([row('jane-doe')], { latestNews: news, check: vi.fn(async () => ({ unsupported: ['won Lakeland'], costUsd: 0.03 })), edit: vi.fn(async () => ({ bio: null, costUsd: 0.02 })) });
    const s = await monthlyRefresh(d);
    expect(d.save).not.toHaveBeenCalled();
    expect(s.biosRefreshed).toEqual([]);
    expect(s.skipped).toEqual([{ slug: 'jane-doe', reason: 'unsupported: won Lakeland' }]);
  });
});

describe('monthly runner refresh: limits', () => {
  const rows = Array.from({ length: 5 }, (_, i) => row(`runner-${String.fromCharCode(97 + i)}`));
  const news = async () => new Map(rows.map((r) => [r.slug, new Date('2026-09-01')]));

  it('stops at the budget', async () => {
    const d = deps(rows, { latestNews: news, write: vi.fn(async () => ({ bio: newBio, costUsd: 1.4 })) });
    const s = await monthlyRefresh(d);
    expect(s.biosRefreshed).toHaveLength(2); // 1.43 + 1.43, then under 0.15 left of $3
    expect(s.cutShort).toBe(true);
    expect(s.skipped.every((x) => x.reason === 'budget')).toBe(true);
  });

  it('never spends past what is left of the monthly news ceiling', async () => {
    const d = deps(rows, { latestNews: news, monthSpentUsd: async () => 12.6 });
    const s = await monthlyRefresh(d);
    expect(s.biosRefreshed).toEqual([]);
    expect(s.cutShort).toBe(true);
  });

  it('stops at the deadline', async () => {
    let t = 0;
    const d = deps(rows, { latestNews: news, bioDeadlineMs: 10, clock: () => t, write: vi.fn(async () => { t += 6; return { bio: newBio, costUsd: 0.05 }; }) });
    const s = await monthlyRefresh(d);
    expect(s.biosRefreshed).toHaveLength(2);
    expect(s.cutShort).toBe(true);
    expect(s.skipped.filter((x) => x.reason === 'out of time')).toHaveLength(3);
  });
});
