import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));

import { completeJsonOpenRouterFirst, openRouterUnavailable, resetOpenRouterHealth, type ClaudeRunner } from '@/lib/llm';
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

describe('sorting when OpenRouter is down (13 Nov 2026: 401 "User not found")', () => {
  const jevOk = { type: { choice: 'news', probabilities: { news: 0.93 } }, topic: { choice: 'trail_ultra', probabilities: {} }, running: { noul: 0.9 }, uk: { noul: 0.1 }, importance: { score: 6 } };
  const claudeVerdict = v({ importance: 6 });
  let fetchMock: ReturnType<typeof vi.fn>;
  let run: ReturnType<typeof vi.fn>;
  // The live sort call, with the Claude CLI swapped for a fake.
  const call = ((opts: Parameters<typeof completeJsonOpenRouterFirst>[0]) =>
    completeJsonOpenRouterFirst({ ...opts, label: 'sort', claude: 'sonnet' }, run as unknown as ClaudeRunner)) as never;
  const deadKey = () => {
    fetchMock = vi.fn(async () => new Response('{"error":{"message":"User not found.","code":401}}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    create.mockRejectedValue(Object.assign(new Error('401 User not found.'), { status: 401 }));
  };

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'k';
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 't';
    create.mockReset().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(v({ importance: 4 })) } }], usage: { cost: 0.002 } });
    run = vi.fn(async () => JSON.stringify({ is_error: false, result: JSON.stringify(claudeVerdict) }));
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

  it('Jev 401, Gemini 401: Claude Code sorts it, with the same prompt and schema', async () => {
    deadKey();
    const r = await sortItemJev(c, call);
    expect(r).toEqual({ verdict: claudeVerdict, costUsd: 0 });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    const [args, stdin] = run.mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(['--model', 'sonnet']));
    expect(stdin).toContain('Classify this running article for a news desk');
    expect(stdin).toContain('"personal_race_report"');
  });

  it('after a 401, the next item goes straight to Claude: no Jev, no Gemini', async () => {
    deadKey();
    await sortItemJev(c, call);
    await sortItemJev({ ...c, articleId: 2, url: 'https://x.test/b' }, call);
    await sortItemJev({ ...c, articleId: 3, url: 'https://x.test/c' }, call);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('the switch does not leak: the next test sorts on Jev again, and Claude is not called', async () => {
    expect(openRouterUnavailable()).toBeNull();
    fetchMock = vi.fn(async () => Response.json({ answers: jevOk, usage: { cost: 0.00006 } }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await sortItemJev(c, call);
    expect(r.costUsd).toBe(0.00006);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('Jev down but Gemini up: Gemini sorts it, Claude is not called', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const r = await sortItemJev(c, call);
    expect(r).toEqual({ verdict: v({ importance: 4 }), costUsd: 0.002 });
    expect(run).not.toHaveBeenCalled();
  });

  it('every provider down: a clear error, not a silent null verdict', async () => {
    deadKey();
    run = vi.fn(async () => { throw new Error('exit 1: Claude usage limit reached'); });
    await expect(sortItemJev(c, call)).rejects.toThrow(/sort: every provider failed/);
  });
});
