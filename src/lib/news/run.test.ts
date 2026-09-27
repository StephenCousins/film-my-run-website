import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NewsRunError, runNews } from './run';
import type { Bundle, Candidate, Draft, Verdict } from './types';
import { UNVERIFIED_NOTE } from './write';

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
    edit: async (dr: Draft) => ({ draft: dr, costUsd: 0.05 }),
    monthSpentUsd: async () => 0,
    recentHeadlines: async () => [],
    takenSlugs: async () => new Set<string>(),
    recentSlugs: async () => new Set<string>(),
    markSeen: async (items: { c: Candidate }[]) => { seen.push(...items.map((i) => i.c.articleId)); },
    more: async () => ({ items: [], costUsd: 0 }),
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
  it('a fact nobody can confirm is kept with an asterisk and the note; nothing is held', async () => {
    const { d, published, held } = deps({
      check: async () => ({ ok: false, unsupported: ['19:37'], costUsd: 0.03 }),
      edit: async (dr: Draft, _b: Bundle, fix: { mark?: string[] }) => ({ draft: fix.mark ? { ...dr, paragraphs: [`${dr.paragraphs[0]} *`, ...dr.paragraphs.slice(1), UNVERIFIED_NOTE] } : dr, costUsd: 0.05 }),
    });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(4);
    expect(held).toHaveLength(0);
    expect(log.notPublished).toHaveLength(0);
    expect((published[0] as unknown as Draft).paragraphs.at(-1)).toBe(UNVERIFIED_NOTE);
  });
  it('a story that can never be put right is not published, and never held', async () => {
    const { d, published, held } = deps({ check: async () => ({ ok: false, unsupported: ['19:37'], costUsd: 0.03 }), edit: async () => ({ draft: null, costUsd: 0.05 }) });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(0);
    expect(held).toHaveLength(0);
    expect(log.notPublished[0].reason).toMatch(/unsupported: 19:37/);
  });
  it('verifies first: other reports that confirm the fact mean no edit at all', async () => {
    let checks = 0; let edits = 0;
    const { d, published } = deps({
      gather: async () => [cand(1), { ...cand(2), source: 'Other' }],
      group: async (items: { c: Candidate; v: Verdict }[]) => ({ costUsd: 0, bundles: [{ key: 'e', headline: 'E', items: items.map((i) => i.c), verdicts: items.map((i) => i.v), alreadyCovered: false }] }),
      check: async () => (checks++ === 0 ? { ok: false, unsupported: ['2:03:17'], costUsd: 0.03 } : { ok: true, unsupported: [], costUsd: 0.03 }),
      more: async () => ({ items: [{ ...cand(0), articleId: 0, url: 'https://x.test/more', source: 'More', text: 'He ran 2:03:17.' }], costUsd: 0.01 }),
      edit: async (dr: Draft) => { edits++; return { draft: dr, costUsd: 0.05 }; },
    });
    await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(1);
    expect(edits).toBe(0);
  });
  it('em dashes and semicolons are fixed in code, without an edit', async () => {
    let edits = 0;
    const { d, published } = deps({
      gather: async () => [cand(1)],
      write: async () => ({ draft: { title: 'T', excerpt: 'E.', paragraphs: ['He won — easily.', 'Then; he rested.', 'Three.'] }, refusal: null, costUsd: 0.06 }),
      edit: async (dr: Draft) => { edits++; return { draft: dr, costUsd: 0.05 }; },
    });
    await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(1);
    expect(edits).toBe(0);
    expect((published[0] as unknown as Draft).paragraphs.slice(0, 2)).toEqual(['He won, easily.', 'Then. He rested.']);
  });
  it('a story led only by a reference-only source is never written', async () => {
    const { d, published } = deps({ gather: async () => [{ ...cand(1), source: 'Marathon Investigation' }] });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(0);
    expect(log.skipped[0]).toEqual({ headline: 'E1', reason: 'reference-only source' });
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
  it('does not publish a duplicate of a recent story (same base slug in the last 14 days)', async () => {
    const { d, published, held } = deps({
      gather: async () => [cand(5)],
      write: async () => ({ draft: { title: 'Same title', excerpt: 'E.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }),
      takenSlugs: async () => new Set(['same-title']),
      recentSlugs: async () => new Set(['same-title']),
    });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(0);
    expect(held).toHaveLength(0);
    expect(log.notPublished[0].reason).toBe('duplicate of a recent story');
  });
  it('still suffixes a same-base slug that belongs to an older story (not from the last 14 days)', async () => {
    const { d, published } = deps({
      gather: async () => [cand(5)],
      write: async () => ({ draft: { title: 'Same title', excerpt: 'E.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }),
      takenSlugs: async () => new Set(['same-title']),
      recentSlugs: async () => new Set<string>(),
    });
    await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published.map((p) => p.slug)).toEqual(['same-title-2']);
  });
  it('passes recentHeadlines straight through to the grouper (the live dep also includes held stories)', async () => {
    let recentSeenByGroup: string[] = [];
    const { d } = deps({
      gather: async () => [cand(5)],
      recentHeadlines: async () => ['A held story title', 'A published story title'],
      group: async (items: { c: Candidate; v: Verdict }[], recent: string[]) => {
        recentSeenByGroup = recent;
        return { costUsd: 0, bundles: items.map(({ c, v }) => ({ key: `e${c.articleId}`, headline: `E${c.articleId}`, items: [c], verdicts: [v], alreadyCovered: false })) };
      },
    });
    await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(recentSeenByGroup).toEqual(['A held story title', 'A published story title']);
  });
  it('one bundle throwing is not published and the run carries on', async () => {
    let n = 0;
    const { d, published, held } = deps({ image: async () => { if (n++ === 0) throw new Error('R2 down'); return { url: 'u', credit: null }; } });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(3);
    expect(held).toHaveLength(0);
    expect(log.notPublished[0].reason).toMatch(/R2 down/);
  });
  it('a throwing writer is held without a story, and the run carries on', async () => {
    let n = 0;
    const { d, published } = deps({ write: async (b: Bundle) => { if (n++ === 0) throw new Error('timeout'); return { draft: { title: b.key, excerpt: 'E.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }; } });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d as never });
    expect(published).toHaveLength(3);
    expect(log.notPublished[0]).toEqual({ headline: 'E5', reason: 'error: timeout' });
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
    expect(log.notPublished[0].reason).toMatch(/near-copy/);
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
  it("takes a one-off story cap", async () => {
    const { d, published } = deps();
    // Five news items (the sixth is a review): the daily cap stops at 4, a one-off cap of 10 takes all five.
    await runNews({ now: new Date(), dryRun: false, deps: d, maxStories: 10 });
    expect(published.length).toBe(5);
  });

  it('edits a near-copy with the phrases named, then publishes', async () => {
    const copied = 'death comes less than three weeks after canadian skyrunner kalie mccrystal went missing';
    const asks: string[][] = [];
    const { d, published } = deps({
      gather: async () => [{ ...cand(1), text: `The ${copied} on the Matterhorn.` }],
      write: async () => ({ draft: { title: 'T', excerpt: 'E.', paragraphs: [`Her ${copied}.`, 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }),
      edit: async (dr: Draft, _b: Bundle, fix: { phrases?: string[] }) => { asks.push(fix.phrases ?? []); return { draft: { ...dr, paragraphs: ['Reworded.', 'Two.', 'Three.'] }, costUsd: 0.05 }; },
    });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d });
    expect(asks[0].join(' ')).toContain('three weeks after');
    expect(published).toHaveLength(1);
    expect(log.notPublished).toHaveLength(0);
  });

  it('looks for more coverage when the source cannot be read, and credits it', async () => {
    const found = { ...cand(0), articleId: 0, url: 'https://fellrunner.test/gossage', source: 'Fell Runner', text: 'Lucy Gossage ran the Pennine Way.' };
    let asked = 0;
    const { d, published } = deps({
      gather: async () => [{ ...cand(1), text: null }],
      more: async () => { asked++; return { items: [found], costUsd: 0.02 }; },
      write: async (b: Bundle) => b.items.some((i) => i.text) ? { draft: { title: 'Gossage', excerpt: 'E.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 } : { draft: null, refusal: 'no full text', costUsd: 0 },
    });
    const log = await runNews({ now: new Date(), dryRun: false, deps: d });
    expect(asked).toBe(1);
    expect(published).toHaveLength(1);
    expect((published[0] as unknown as { sources: { site: string }[] }).sources.map((s) => s.site)).toContain('Fell Runner');
    expect((published[0] as unknown as { articleIds: number[] }).articleIds).toEqual([1]);
    expect(log.costUsd).toBeGreaterThan(0.08);
  });

  it('edits out the facts the checker could not find, then publishes', async () => {
    const asks: (string[] | undefined)[] = [];
    let checks = 0;
    const { d, published } = deps({
      gather: async () => [cand(1), { ...cand(2), source: 'Other' }],
      group: async (items: { c: Candidate; v: Verdict }[]) => ({ costUsd: 0, bundles: [{ key: 'e', headline: 'E', items: items.map((i) => i.c), verdicts: items.map((i) => i.v), alreadyCovered: false }] }),
      edit: async (dr: Draft, _b: Bundle, fix: { unsupported?: string[] }) => { asks.push(fix.unsupported); return { draft: dr, costUsd: 0.05 }; },
      check: async () => (checks++ < 2 ? { ok: false, unsupported: ['Lake District'], costUsd: 0.03 } : { ok: true, unsupported: [], costUsd: 0.03 }),
    });
    await runNews({ now: new Date(), dryRun: false, deps: d });
    expect(asks[0]).toEqual(['Lake District']);
    expect(published).toHaveLength(1);
  });
});
