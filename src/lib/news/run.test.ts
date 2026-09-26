import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NewsRunError, runNews } from './run';
import type { Bundle, Candidate, Verdict } from './types';

const cand = (id: number): Candidate => ({ articleId: id, url: `https://x.test/${id}`, source: 'iRunFar', title: `T${id}`, pubDate: new Date(), summary: 's', text: `full text ${id}`, imageUrl: null, photoCredit: null });
const news = (importance: number): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance });

function deps(over: Record<string, unknown> = {}) {
  const published: { slug: string; photoCredit: string | null }[] = [];
  const held: string[] = [];
  const seen: number[] = [];
  const d = {
    gather: async () => [cand(1), cand(2), cand(3), cand(4), cand(5), cand(6)],
    sort: async (c: Candidate) => ({ verdict: c.articleId === 6 ? { ...news(9), type: 'review' as const } : news(c.articleId), costUsd: 0.001 }),
    group: async (items: { c: Candidate; v: Verdict }[]) => ({ costUsd: 0.002, bundles: items.map(({ c, v }) => ({ key: `e${c.articleId}`, headline: `E${c.articleId}`, items: [c], verdicts: [v], alreadyCovered: false })) }),
    write: async (b: Bundle) => ({ draft: { title: `A title ${b.key}`, excerpt: 'An excerpt.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }),
    check: async () => ({ ok: true, unsupported: [], costUsd: 0.03 }),
    image: async () => ({ url: 'https://r2.test/x.webp', credit: 'Photo: iRunFar' }),
    publish: async (s: { slug: string; photoCredit: string | null }) => { published.push(s); },
    hold: async (s: { slug: string }) => { held.push(s.slug); return 42; },
    monthSpentUsd: async () => 0,
    recentHeadlines: async () => [],
    takenSlugs: async () => new Set<string>(),
    markSeen: async (items: { c: Candidate }[]) => { seen.push(...items.map((i) => i.c.articleId)); },
    ...over,
  };
  return { d, published, held, seen };
}

describe('a news run', () => {
  it('writes at most 4, the most important first, and skips non-news', async () => {
    const { d, published } = deps();
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(log.published).toHaveLength(4);
    expect(published).toHaveLength(4);
    expect(log.published[0].title).toBe('A title e5');
    expect(log.sortedOut.map((s) => s.type)).toContain('review');
    expect(log.costUsd).toBeCloseTo(6 * 0.001 + 0.002 + 4 * 0.09, 5);
  });
  it('holds (saves, unpublished) a story that fails the fact check', async () => {
    const { d, published, held } = deps({ check: async () => ({ ok: false, unsupported: ['19:37'], costUsd: 0.03 }) });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(0);
    expect(held).toHaveLength(4);
    expect(log.held[0].reason).toMatch(/unsupported: 19:37/);
    expect(log.held[0].storyId).toBe(42);
  });
  it('stops writing at the ceiling but keeps what it wrote', async () => {
    // $12.50 already spent this month; the ceiling is £10 x 1.27 = $12.70. The first story fits,
    // and what this run has spent (sorting, grouping, that story) stops the second.
    const { d, published } = deps({ monthSpentUsd: async () => 12.5 });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(1);
    expect(log.stoppedByCeiling).toBe(true);
    expect(log.skipped.filter((s) => s.reason === 'monthly ceiling')).toHaveLength(3);
  });
  it('a dry run publishes nothing and marks nothing seen', async () => {
    const { d, published, seen } = deps();
    const log = await runNews({ now: new Date(), dryRun: true, deps: d as never });
    expect(published).toHaveLength(0);
    expect(seen).toHaveLength(0);
    expect(log.published).toHaveLength(4);
  });
  it('logs items the grouper left out, and leaves them unseen for the next run', async () => {
    const { d, seen } = deps({
      group: async (items: { c: Candidate; v: Verdict }[]) => ({ costUsd: 0, bundles: items.filter(({ c }) => c.articleId !== 2).map(({ c, v }) => ({ key: `e${c.articleId}`, headline: `E${c.articleId}`, items: [c], verdicts: [v], alreadyCovered: false })) }),
    });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(log.ungrouped).toEqual([{ url: 'https://x.test/2', title: 'T2' }]);
    expect(seen).not.toContain(2);
  });
  it('leaves bundles over the cap unseen and says so', async () => {
    const { d, seen } = deps({ gather: async () => [1, 3, 4, 5, 7].map(cand) });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(log.skipped).toEqual([{ headline: 'E1', reason: 'over the 4-story cap' }]);
    expect(seen).not.toContain(1);
    expect(seen).toContain(7);
  });
  it('never reuses a slug from the database or from earlier in the run', async () => {
    const { d, published } = deps({
      write: async () => ({ draft: { title: 'Same title', excerpt: 'E.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }),
      takenSlugs: async () => new Set(['same-title']),
    });
    await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published.map((p) => p.slug)).toEqual(['same-title-2', 'same-title-3', 'same-title-4', 'same-title-5']);
  });
  it('one bundle throwing holds that story and the run carries on', async () => {
    let n = 0;
    const { d, published, held } = deps({ image: async () => { if (n++ === 0) throw new Error('R2 down'); return { url: 'u', credit: null }; } });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(3);
    expect(held).toHaveLength(1);
    expect(log.held[0].reason).toMatch(/R2 down/);
  });
  it('a throwing writer is held without a story, and the run carries on', async () => {
    let n = 0;
    const { d, published } = deps({ write: async (b: Bundle) => { if (n++ === 0) throw new Error('timeout'); return { draft: { title: b.key, excerpt: 'E.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }; } });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(3);
    expect(log.held[0]).toEqual({ headline: 'E5', reason: 'error: timeout' });
  });
  it('publishes the photo credit the image step returned', async () => {
    const { d, published } = deps();
    await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published.every((p) => p.photoCredit === 'Photo: iRunFar')).toBe(true);
  });
  it('checks near-copy against the full source text, not the first 12,000 characters', async () => {
    const copied = 'the leader went through the aid station at halfway in the dark';
    const long = cand(5);
    long.text = `${'filler '.repeat(3000)}${copied}`;
    const { d, published } = deps({
      gather: async () => [long],
      write: async () => ({ draft: { title: 'T', excerpt: 'E.', paragraphs: [`So ${copied}.`, 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }),
    });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(0);
    expect(log.held[0].reason).toMatch(/near-copy/);
  });
  it('a run that fails partway still reports what it spent', async () => {
    let calls = 0;
    const { d } = deps({ sort: async () => { if (calls++ > 0) throw new Error('OpenRouter 502'); return { verdict: news(5), costUsd: 0.001 }; } });
    const err = await runNews({ now: new Date(), dryRun: false, deps: d as never }).catch((e) => e);
    expect(err).toBeInstanceOf(NewsRunError);
    expect(err.message).toBe('OpenRouter 502');
    expect(err.log.costUsd).toBeCloseTo(0.001, 6);
  });
  it('a dry run with a folder saves its images there instead of uploading them', async () => {
    const outDir = await mkdtemp(path.join(tmpdir(), 'news-dry-'));
    let upload: ((key: string, body: Buffer, type: string) => Promise<string>) | undefined;
    const { d } = deps({
      gather: async () => [cand(5)],
      image: async (_b: Bundle, slug: string, imgDeps?: { upload?: typeof upload }) => {
        upload = imgDeps?.upload;
        return { url: await upload!(`news/${slug}.webp`, Buffer.from('webp'), 'image/webp'), credit: null };
      },
    });
    const log = await runNews({ now: new Date(), dryRun: true, outDir, deps: d as never });
    expect(upload).toBeTypeOf('function');
    const file = path.join(outDir, `${log.published[0].slug}.webp`);
    expect(await readFile(file, 'utf8')).toBe('webp');
    expect(JSON.parse(await readFile(path.join(outDir, `${log.published[0].slug}.json`), 'utf8')).imageUrl).toBe(file);
    await rm(outDir, { recursive: true });
  });
});
