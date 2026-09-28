import { describe, expect, it, vi } from 'vitest';
import { MONTHLY_BIO_LIMIT, monthlyRefresh, type MonthlyDeps, type PageRow } from './monthly';
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
    readUtmb: vi.fn(async () => ({ results: [] as BestFinish[] })),
    setFinishes: vi.fn(async () => {}),
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

describe('monthly runner refresh: results', () => {
  it('adds a new podium, not a duplicate, a non-podium or one from before the last check', async () => {
    const have = [finish('Lakeland 100', 2026, '1st woman')];
    const d = deps([row('jane-doe', { best_finishes: have })], {
      readUtmb: vi.fn(async () => ({ results: [finish('Lakeland 100', 2026, '1st woman'), finish('Lavaredo', 2026, '2nd woman'), finish('Zegama', 2026, '4th woman'), finish('Old Race', 2026, '1st woman', '2026-03-01')] })),
    });
    const s = await monthlyRefresh(d);
    expect(s.resultsAdded).toBe(1);
    expect(d.setFinishes).toHaveBeenCalledWith('jane-doe', [have[0], expect.objectContaining({ race: 'Lavaredo' })]);
  });

  it('keeps at most 10, podiums first, then newest', async () => {
    const have = Array.from({ length: 10 }, (_, i) => finish(`Race ${i}`, 2015 + i, '3rd woman'));
    const d = deps([row('jane-doe', { best_finishes: have })], { readUtmb: vi.fn(async () => ({ results: [finish('New Win', 2026, '1st woman')] })) });
    await monthlyRefresh(d);
    const saved = (vi.mocked(d.setFinishes).mock.calls[0] as unknown as [string, BestFinish[]])[1];
    expect(saved).toHaveLength(10);
    expect(saved[0].race).toBe('New Win');
    expect(saved.map((b) => b.race)).not.toContain('Race 0');
  });

  it('runners without a UTMB page are not read', async () => {
    const d = deps([row('jane-doe', { utmb_uri: null })]);
    await monthlyRefresh(d);
    expect(d.readUtmb).not.toHaveBeenCalled();
  });
});

describe('monthly runner refresh: which bios', () => {
  it('a new story or a new podium selects; an older story does not', async () => {
    const rows = [row('new-story'), row('old-story'), row('new-podium'), row('nothing')];
    const d = deps(rows, {
      latestNews: async () => new Map([['new-story', new Date('2026-09-01')], ['old-story', new Date('2026-05-01')]]),
      readUtmb: vi.fn(async (uri: string) => ({ results: uri === '1.new-podium' ? [finish('Lavaredo', 2026, '3rd')] : [] })),
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
    // The writer saw the old bio, labelled as our previous profile.
    const seen = (vi.mocked(d.write).mock.calls[0] as unknown as [RunnerFile, string[]]);
    expect(seen[1]).toEqual(['She is a runner.', 'She won a race.', 'She runs now.']);
    expect(seen[0].texts.map((t) => t.source.name)).toContain('Film My Run previous profile');
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
    const d = deps(rows, { latestNews: news, deadlineMs: 10, clock: () => t, write: vi.fn(async () => { t += 6; return { bio: newBio, costUsd: 0.05 }; }) });
    const s = await monthlyRefresh(d);
    expect(s.biosRefreshed).toHaveLength(2);
    expect(s.cutShort).toBe(true);
    expect(s.skipped.filter((x) => x.reason === 'out of time')).toHaveLength(3);
  });
});
