import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));
const finalMessage = vi.fn();
const stream = vi.fn((_req: unknown) => ({ finalMessage }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { stream }; } }));

import { claudeCreditSpentThisRun, completeJsonClaudeFirst, noteOpenRouterFailure, resetOpenRouterHealth, type ClaudeRunner } from '@/lib/llm';
import { passesSort, isBorderline, isRoundUp, sortItem, sortItemJev } from './sort';
import type { Candidate, Verdict } from './types';

const v = (over: Partial<Verdict>): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance: 7, ...over });
const c: Candidate = { articleId: 1, url: 'https://x.test/a', source: 'iRunFar', title: 'T', pubDate: new Date(), summary: 's', text: 'full', imageUrl: null, photoCredit: null };

describe('sorting', () => {
  it('passes only running news at 0.90 or more', () => {
    expect(passesSort(v({}))).toBe(true);
    expect(passesSort(v({ confidence: 0.89 }))).toBe(false);
    expect(passesSort(v({ type: 'review' }))).toBe(false);
    expect(passesSort(v({ isRunning: false }))).toBe(false);
    expect(passesSort(null)).toBe(false);
  });
  it('marks news at 0.50-0.90 as borderline for the log', () => {
    expect(isBorderline(v({ confidence: 0.7 }))).toBe(true);
    expect(isBorderline(v({ confidence: 0.95 }))).toBe(false);
    expect(isBorderline(v({ type: 'opinion', confidence: 0.7 }))).toBe(false);
  });
  it('a reply that is not a verdict gives null, not a throw', async () => {
    const call = async () => ({ data: null, costUsd: 0.001, raw: 'nope' });
    const r = await sortItem(c, call as never);
    expect(r.verdict).toBeNull();
    expect(r.costUsd).toBe(0.001);
  });
  it('a confidence outside [0, 1] fails closed', async () => {
    const call = async () => ({ data: v({ confidence: 1.5 }), costUsd: 0.001, raw: '' });
    const r = await sortItem(c, call as never);
    expect(r.verdict).toBeNull();
  });
});

describe('round-ups', () => {
  it('settles a round-up as not news without calling the model (Stephen, 2 Oct 2026)', async () => {
    const titles = ['The RunUltra Update: 28 September 2026', 'The RunUltra Update; Milne takes Bronze, Records broken', 'The Ultra Update: Hartmuth Runs Third',
      'Weekend Ultra News 7 September 2026', "Megan Eckert and Sarah Perry Headline This Week's Ultra-Running News", 'Weekly round-up: Boston and London'];
    for (const title of titles) {
      let called = false;
      const call = (async () => { called = true; return { data: null, costUsd: 0, raw: '' }; }) as never;
      expect(passesSort((await sortItemJev({ ...c, title }, call)).verdict)).toBe(false);
      expect(called).toBe(false);
    }
  });
  it('leaves single-event stories alone', () => {
    for (const title of ["Eckert breaks Six-Day Record and Shircore wins Inaugural Dragon's Fire", 'Dragon’s Fire Race Report', 'Kipyegon updates her mile record']) {
      expect(isRoundUp(title)).toBe(false);
    }
  });
});

describe('sortItem media pages', () => {
  it('settles a video page as media without calling the model', async () => {
    let called = false;
    const call = (async () => { called = true; return { data: null, costUsd: 0.001, raw: '' }; }) as never;
    const r = await sortItem({ ...c, url: 'https://www.bbc.co.uk/sport/athletics/videos/cv2dw8p0g12ro?at_medium=RSS' }, call);
    expect(called).toBe(false);
    expect(passesSort(r.verdict)).toBe(false);
    expect(r.costUsd).toBe(0);
  });
});

describe('sortItemJev', () => {
  const answers = (over: object = {}) => ({
    type: { choice: 'news', probabilities: { news: 0.93 } }, topic: { choice: 'track', probabilities: {} },
    running: { noul: 0.9 }, uk: { noul: 0.8 }, importance: { score: 6.2 }, ...over,
  });
  const stubFetch = (res: Response) => vi.stubGlobal('fetch', vi.fn(async () => res));
  const gemini = async () => ({ data: v({ importance: 4 }), costUsd: 0.002, raw: '' });
  afterEach(() => { vi.unstubAllGlobals(); resetOpenRouterHealth(); });

  it('maps answers to a verdict, with the UK bonus and the track offset', async () => {
    stubFetch(Response.json({ answers: answers(), usage: { cost: 0.00006 } }));
    const r = await sortItemJev(c, gemini as never);
    // score 6.2 -> 6, +1 to the 1-10 scale, +1 UK, -3 track
    expect(r.verdict).toEqual({ type: 'news', confidence: 0.93, isRunning: true, topic: 'track', isUk: true, importance: 5 });
    expect(r.costUsd).toBe(0.00006);
  });
  it('falls back to the chat sorter when Jev errors', async () => {
    stubFetch(new Response('down', { status: 503 }));
    const r = await sortItemJev(c, gemini as never);
    expect(r.verdict?.importance).toBe(4);
    expect(r.costUsd).toBe(0.002);
  });
  it('falls back when an answer is malformed', async () => {
    stubFetch(Response.json({ answers: answers({ type: { choice: 'gossip', probabilities: {} } }) }));
    const r = await sortItemJev(c, gemini as never);
    expect(r.verdict?.importance).toBe(4);
  });
});

describe('the daily sorter: Claude key, then Claude Code, then OpenRouter (19 Nov 2026)', () => {
  const keyVerdict = v({ importance: 8 });
  const cliVerdict = v({ importance: 6 });
  const orVerdict = v({ importance: 4 });
  let run: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  // The live sort call, with the Claude CLI swapped for a fake.
  const call = ((opts: Parameters<typeof completeJsonClaudeFirst>[0]) =>
    completeJsonClaudeFirst({ ...opts, label: 'sort', claude: 'sonnet' }, run as unknown as ClaudeRunner)) as never;
  const keyReplies = (text: string) => finalMessage.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text }], usage: { input_tokens: 2000, output_tokens: 200 } });
  const cliFails = () => { run = vi.fn(async () => { throw new Error('exit 1: Claude usage limit reached'); }); };

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'k';
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 't';
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    create.mockReset().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(orVerdict) } }], usage: { cost: 0.002 } });
    finalMessage.mockReset();
    stream.mockClear();
    run = vi.fn(async () => JSON.stringify({ is_error: false, result: JSON.stringify(cliVerdict) }));
    // Jev is out of the daily run: it must not be called.
    fetchMock = vi.fn(async () => { throw new Error('Jev should not be called'); });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetOpenRouterHealth();
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    delete process.env.ANTHROPIC_CREDIT_API_KEY;
  });

  it('the key sorts it on Sonnet 5.5, its real cost on the Claude credit, not the ceiling; nothing else is called', async () => {
    keyReplies(JSON.stringify(keyVerdict));
    const r = await sortItem(c, call);
    expect(r.verdict).toEqual(keyVerdict);
    expect(r.costUsd).toBe(0);
    expect(claudeCreditSpentThisRun()).toBeCloseTo((2000 * 2 + 200 * 10) / 1e6);
    const req = stream.mock.calls[0][0] as { model: string; messages: { content: string }[] };
    expect(req.model).toBe('claude-sonnet-5-5');
    expect(req.messages[0].content).toContain('Classify this running article for a news desk');
    expect(run).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([['missing', undefined], ['empty', '']])('key %s: Claude Code sorts it, with the same prompt and schema', async (_n, key) => {
    if (key === undefined) delete process.env.ANTHROPIC_CREDIT_API_KEY;
    else process.env.ANTHROPIC_CREDIT_API_KEY = key;
    const r = await sortItem(c, call);
    expect(r).toEqual({ verdict: cliVerdict, costUsd: 0 });
    expect(stream).not.toHaveBeenCalled();
    const [args, stdin] = run.mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(['--model', 'sonnet']));
    expect(stdin).toContain('Classify this running article for a news desk');
    expect(stdin).toContain('"personal_race_report"');
  });

  it('the key fails: Claude Code', async () => {
    finalMessage.mockRejectedValue(new Error('400 credit balance too low'));
    expect((await sortItem(c, call)).verdict).toEqual(cliVerdict);
    expect(create).not.toHaveBeenCalled();
  });

  it('the key replies with prose: Claude Code', async () => {
    keyReplies('I think this is news.');
    expect((await sortItem(c, call)).verdict).toEqual(cliVerdict);
  });

  it('key and Claude Code fail: OpenRouter on SORT_MODEL', async () => {
    finalMessage.mockRejectedValue(new Error('400 credit balance too low'));
    cliFails();
    const r = await sortItem(c, call);
    expect(r.verdict).toEqual(orVerdict);
    expect(create.mock.calls[0][0].model).toBe('google/gemini-3.7-flash');
  });

  it('OpenRouter switched off for the run: not called, and a clear error', async () => {
    finalMessage.mockRejectedValue(new Error('400 credit balance too low'));
    cliFails();
    noteOpenRouterFailure(Object.assign(new Error('401 User not found.'), { status: 401 }));
    await expect(sortItem(c, call)).rejects.toThrow(/sort: every provider failed.*switched off/);
    expect(create).not.toHaveBeenCalled();
  });

  it('every provider down: a clear error, not a silent null verdict', async () => {
    finalMessage.mockRejectedValue(new Error('400 credit balance too low'));
    cliFails();
    create.mockRejectedValue(Object.assign(new Error('401 User not found.'), { status: 401 }));
    await expect(sortItem(c, call)).rejects.toThrow(/sort: every provider failed/);
  });
});
