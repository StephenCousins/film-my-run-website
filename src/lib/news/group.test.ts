import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));
const finalMessage = vi.fn();
const stream = vi.fn((_req: unknown) => ({ finalMessage }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { stream }; } }));

import { claudeCreditSpentThisRun, completeJsonClaudeFirst, noteOpenRouterFailure, resetOpenRouterHealth, type ClaudeRunner } from '@/lib/llm';
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

describe('grouping: Claude key, then Claude Code, then OpenRouter (19 Nov 2026)', () => {
  const groups = { groups: [{ key: 'utmb-2026-result', headline: 'UTMB result', articleIds: [1, 2], alreadyCovered: false }] };
  const items = [{ c: cand(1), v: v(9) }, { c: cand(2), v: v(8) }];
  let run: ReturnType<typeof vi.fn>;
  const call = ((opts: Parameters<typeof completeJsonClaudeFirst>[0]) =>
    completeJsonClaudeFirst({ ...opts, label: 'group', claude: 'opus' }, run as unknown as ClaudeRunner)) as never;
  const keyFails = () => finalMessage.mockRejectedValue(new Error('400 credit balance too low'));
  const cliFails = () => { run = vi.fn(async () => { throw new Error('spawn claude ENOENT'); }); };

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'k';
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 't';
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    create.mockReset().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(groups) } }], usage: { cost: 0.003 } });
    finalMessage.mockReset().mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(groups) }], usage: { input_tokens: 5000, output_tokens: 1000 } });
    stream.mockClear();
    run = vi.fn(async () => JSON.stringify({ is_error: false, result: JSON.stringify(groups) }));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetOpenRouterHealth();
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    delete process.env.ANTHROPIC_CREDIT_API_KEY;
  });

  it('the key groups them on Opus 5.5, its real cost on the Claude credit, not the ceiling; nothing else is called', async () => {
    const r = await groupItems(items, [], call);
    expect(r.bundles.map((b) => b.items.map((i) => i.articleId))).toEqual([[1, 2]]);
    expect(r.costUsd).toBe(0);
    expect(claudeCreditSpentThisRun()).toBeCloseTo((5000 * 4 + 1000 * 20) / 1e6);
    expect((stream.mock.calls[0][0] as { model: string }).model).toBe('claude-opus-5-5');
    expect(run).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([['missing', undefined], ['empty', '']])('key %s: Claude Code (Opus) groups them, with the same prompt and schema', async (_n, key) => {
    if (key === undefined) delete process.env.ANTHROPIC_CREDIT_API_KEY;
    else process.env.ANTHROPIC_CREDIT_API_KEY = key;
    const r = await groupItems(items, [], call);
    expect(r.costUsd).toBe(0);
    expect(stream).not.toHaveBeenCalled();
    const [args, stdin] = run.mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(['--model', 'opus']));
    expect(stdin).toContain('Group these running news items');
    expect(stdin).toContain('"alreadyCovered"');
  });

  it('the key fails: Claude Code', async () => {
    keyFails();
    await groupItems(items, [], call);
    expect(run).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });

  it('the key replies with prose: Claude Code', async () => {
    finalMessage.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Here are the groups.' }], usage: { input_tokens: 1, output_tokens: 1 } });
    await groupItems(items, [], call);
    expect(run).toHaveBeenCalledOnce();
  });

  it('key and Claude Code fail: Gemini on OpenRouter', async () => {
    keyFails();
    cliFails();
    const r = await groupItems(items, [], call);
    expect(r.costUsd).toBe(0.003);
    expect(r.bundles).toHaveLength(1);
  });

  it('OpenRouter already switched off by the sort: no OpenRouter call at all', async () => {
    keyFails();
    cliFails();
    noteOpenRouterFailure(Object.assign(new Error('401 User not found.'), { status: 401 }));
    await expect(groupItems(items, [], call)).rejects.toThrow(/group: every provider failed/);
    expect(create).not.toHaveBeenCalled();
  });

  it('every provider down: a clear error', async () => {
    keyFails();
    cliFails();
    create.mockRejectedValue(Object.assign(new Error('401 User not found.'), { status: 401 }));
    await expect(groupItems(items, [], call)).rejects.toThrow(/group: every provider failed/);
  });
});
