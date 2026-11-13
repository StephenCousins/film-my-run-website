import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));

import { completeJsonOpenRouterFirst, openRouterUnavailable, resetOpenRouterHealth, type ClaudeRunner } from '@/lib/llm';
import { bundleImportance, groupItems } from './group';
import type { Candidate, Verdict } from './types';

const cand = (id: number): Candidate => ({ articleId: id, url: `https://x.test/${id}`, source: 'S', title: `T${id}`, pubDate: new Date(), summary: '', text: 't', imageUrl: null, photoCredit: null });
const v = (importance: number, isUk = false): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk, importance });

describe('grouping', () => {
  it("builds bundles from the model's groups and drops unknown ids", async () => {
    const call = async () => ({ costUsd: 0.002, raw: '', data: { groups: [
      { key: 'utmb-2026-result', headline: 'UTMB result', articleIds: [1, 2, 99], alreadyCovered: false },
      { key: 'london-preview', headline: 'London preview', articleIds: [3], alreadyCovered: true },
    ] } });
    const r = await groupItems([{ c: cand(1), v: v(9) }, { c: cand(2), v: v(8) }, { c: cand(3), v: v(5) }], ['London Marathon preview'], call as never);
    expect(r.bundles).toHaveLength(2);
    expect(r.bundles[0].items.map((i) => i.articleId)).toEqual([1, 2]);
    expect(r.bundles[1].alreadyCovered).toBe(true);
  });
  it('an articleId in more than one group stays only in the first', async () => {
    const call = async () => ({ costUsd: 0.002, raw: '', data: { groups: [
      { key: 'first', headline: 'First', articleIds: [1], alreadyCovered: false },
      { key: 'second', headline: 'Second', articleIds: [1], alreadyCovered: false },
    ] } });
    const r = await groupItems([{ c: cand(1), v: v(9) }], [], call as never);
    expect(r.bundles).toHaveLength(1);
    expect(r.bundles[0].key).toBe('first');
    expect(r.bundles[0].items.map((i) => i.articleId)).toEqual([1]);
  });
  it('a bundle is as important as its most important item, plus its coverage', () => {
    expect(bundleImportance({ key: 'k', headline: 'h', items: [], verdicts: [v(6), v(8)], alreadyCovered: false })).toBe(8);
    // The sorter already adds a point for a British angle; the bundle doesn't add another (27 Sep 2026).
    expect(bundleImportance({ key: 'k', headline: 'h', items: [], verdicts: [v(6, true)], alreadyCovered: false })).toBe(6);
    // How widely it is covered is the best sign of a big story: +1 for two sites, +2 for three or more.
    const item = (source: string) => ({ articleId: 1, url: `https://${source}.test/a`, source, title: 't', pubDate: new Date(), summary: '', text: 'x', imageUrl: null, photoCredit: null });
    expect(bundleImportance({ key: 'k', headline: 'h', items: [item('a'), item('a')], verdicts: [v(6)], alreadyCovered: false })).toBe(6);
    expect(bundleImportance({ key: 'k', headline: 'h', items: [item('a'), item('b')], verdicts: [v(6)], alreadyCovered: false })).toBe(7);
    expect(bundleImportance({ key: 'k', headline: 'h', items: [item('a'), item('b'), item('c')], verdicts: [v(9)], alreadyCovered: false })).toBe(10);
  });
  it('trail and ultra beat road and track, unless it is a world record (Stephen, 2 Oct 2026)', () => {
    const item = (source: string, title = 't') => ({ articleId: 1, url: `https://${source}.test/a`, source, title, pubDate: new Date(), summary: '', text: 'x', imageUrl: null, photoCredit: null });
    const road = (i: number): Verdict => ({ ...v(i), topic: 'road' });
    // A Bob Graham record, two UK sites, beats Berlin results on every site.
    const bgr = bundleImportance({ key: 'b', headline: 'h', items: [item('a'), item('b')], verdicts: [v(8)], alreadyCovered: false });
    const berlin = bundleImportance({ key: 'k', headline: 'h', items: [item('a'), item('b'), item('c')], verdicts: [road(8)], alreadyCovered: false });
    expect(bgr).toBeGreaterThan(berlin);
    // Unless Berlin was a world record.
    const wr = bundleImportance({ key: 'k', headline: 'h', items: [item('a', 'Sawe breaks the marathon world record in Berlin'), item('b'), item('c')], verdicts: [road(9)], alreadyCovered: false });
    expect(wr).toBeGreaterThan(bgr);
    expect(bundleImportance({ key: 'k', headline: 'h', items: [], verdicts: [{ ...v(7), topic: 'track' }], alreadyCovered: false })).toBe(5);
  });
});

describe('grouping when OpenRouter is down', () => {
  const groups = { groups: [{ key: 'utmb-2026-result', headline: 'UTMB result', articleIds: [1, 2], alreadyCovered: false }] };
  const items = [{ c: cand(1), v: v(9) }, { c: cand(2), v: v(8) }];
  let run: ReturnType<typeof vi.fn>;
  const call = ((opts: Parameters<typeof completeJsonOpenRouterFirst>[0]) =>
    completeJsonOpenRouterFirst({ ...opts, label: 'group', claude: 'opus' }, run as unknown as ClaudeRunner)) as never;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'k';
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 't';
    create.mockReset().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(groups) } }], usage: { cost: 0.003 } });
    run = vi.fn(async () => JSON.stringify({ is_error: false, result: JSON.stringify(groups) }));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetOpenRouterHealth();
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  });

  it('OpenRouter 401: Claude Code (Opus) groups them, with the same prompt and schema', async () => {
    create.mockRejectedValue(Object.assign(new Error('401 User not found.'), { status: 401 }));
    const r = await groupItems(items, [], call);
    expect(r.costUsd).toBe(0);
    expect(r.bundles.map((b) => b.items.map((i) => i.articleId))).toEqual([[1, 2]]);
    const [args, stdin] = run.mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(['--model', 'opus']));
    expect(stdin).toContain('Group these running news items');
    expect(stdin).toContain('"alreadyCovered"');
  });

  it('OpenRouter already switched off by the sort: no OpenRouter call at all', async () => {
    create.mockRejectedValue(Object.assign(new Error('401 User not found.'), { status: 401 }));
    await completeJsonOpenRouterFirst({ model: 'm', prompt: 'p', maxTokens: 1, schemaName: 's', schema: {}, label: 'sort' }, run as unknown as ClaudeRunner);
    create.mockClear();
    await groupItems(items, [], call);
    expect(create).not.toHaveBeenCalled();
  });

  it('OpenRouter up: Gemini groups them and Claude is not called', async () => {
    expect(openRouterUnavailable()).toBeNull();
    const r = await groupItems(items, [], call);
    expect(r.costUsd).toBe(0.003);
    expect(run).not.toHaveBeenCalled();
  });

  it('every provider down: a clear error', async () => {
    create.mockRejectedValue(Object.assign(new Error('401 User not found.'), { status: 401 }));
    run = vi.fn(async () => { throw new Error('spawn claude ENOENT'); });
    await expect(groupItems(items, [], call)).rejects.toThrow(/group: every provider failed/);
  });
});
