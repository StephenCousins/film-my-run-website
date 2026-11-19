import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const create = vi.fn();
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));
const finalMessage = vi.fn();
const stream = vi.fn((_req: unknown) => ({ finalMessage }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { stream }; } }));

import {
  claudeApiKey, completeJson, completeJsonClaudeFirst, errorCostUsd, isOpenRouterKeyProblem, llmConfigured, noteOpenRouterFailure,
  openRouterUnavailable, resetOpenRouterHealth, searchWeb, type ClaudeRunner,
} from './llm';
import { claudeCostUsd } from './llm-prices';
import { WRITE_MODEL, SORT_MODEL, GROUP_MODEL } from './news/models';

const opts = { model: WRITE_MODEL, prompt: 'hi', maxTokens: 10, schemaName: 's', schema: { type: 'object' } };
const cli = (result: string, extra = {}): ClaudeRunner => vi.fn(async () => JSON.stringify({ is_error: false, result, ...extra }));
/** A Claude API reply with usage, as the SDK's finalMessage() gives it. */
const apiReply = (text: string, usage = { input_tokens: 1000, output_tokens: 100 }) =>
  ({ stop_reason: 'end_turn', content: [{ type: 'text', text }], usage });
const lastRequest = () => stream.mock.calls.at(-1)![0] as Record<string, unknown>;

let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'k';
  process.env.CLAUDE_CODE_OAUTH_TOKEN = 't';
  create.mockReset().mockResolvedValue({ choices: [{ message: { content: '{"via":"openrouter"}' } }], usage: { cost: 0.5 } });
  finalMessage.mockReset();
  stream.mockClear();
  log = vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  delete process.env.ANTHROPIC_CREDIT_API_KEY;
  resetOpenRouterHealth();
  vi.restoreAllMocks();
});

describe('completeJson via Claude Code', () => {
  it('uses OpenRouter only when the token is unset', async () => {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    const run = cli('{"via":"claude"}');
    const r = await completeJson(opts, run);
    expect(run).not.toHaveBeenCalled();
    expect(r).toMatchObject({ data: { via: 'openrouter' }, costUsd: 0.5 });
  });

  it('returns the CLI reply at cost 0 without calling OpenRouter', async () => {
    const run = cli('{"via":"claude"}');
    const r = await completeJson(opts, run);
    expect(r).toEqual({ data: { via: 'claude' }, costUsd: 0, raw: '{"via":"claude"}' });
    expect(create).not.toHaveBeenCalled();
    const [args, stdin] = (run as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(['-p', '--output-format', 'json', '--tools', '']));
    expect(stdin).toContain('hi');
    expect(stdin).toContain('{"type":"object"}');
  });

  it('parses a fenced ```json reply', async () => {
    const r = await completeJson(opts, cli('```json\n{"via":"claude"}\n```'));
    expect(r.data).toEqual({ via: 'claude' });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['non-zero exit', vi.fn(async () => { throw new Error('exit 1: boom'); })],
    ['timeout', vi.fn(async () => { throw new Error('killed by SIGTERM (timeout?)'); })],
    ['garbage reply', cli('Sorry, I cannot do that.')],
    ['usage limit', cli('Claude usage limit reached', { is_error: true })],
    ['non-JSON stdout', vi.fn(async () => 'not json')],
  ])('falls back to OpenRouter on %s', async (_name, run) => {
    const r = await completeJson(opts, run as ClaudeRunner);
    expect(r).toMatchObject({ data: { via: 'openrouter' }, costUsd: 0.5 });
    expect(create).toHaveBeenCalledOnce();
  });

  it('never tries the CLI for a Gemini model', async () => {
    const run = cli('{"via":"claude"}');
    await completeJson({ ...opts, model: SORT_MODEL }, run);
    expect(run).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
  });
});

describe('completeJson order for writing and checking: CLI, then the key, then OpenRouter', () => {
  it('CLI works: neither the key nor OpenRouter is called', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    const r = await completeJson(opts, cli('{"via":"claude"}'));
    expect(r.costUsd).toBe(0);
    expect(stream).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('CLI fails: the key on Opus 5.5, with its real cost', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce(apiReply('{"via":"key"}'));
    const r = await completeJson(opts, vi.fn(async () => { throw new Error('exit 1: usage limit'); }));
    expect(r.data).toEqual({ via: 'key' });
    expect(lastRequest().model).toBe('claude-opus-5-5');
    expect(r.costUsd).toBeCloseTo((1000 * 4 + 100 * 20) / 1e6);
    expect(create).not.toHaveBeenCalled();
  });

  it('CLI and key fail: OpenRouter', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockRejectedValueOnce(new Error('400 credit balance too low'));
    const r = await completeJson(opts, vi.fn(async () => { throw new Error('exit 1'); }));
    expect(r).toMatchObject({ data: { via: 'openrouter' }, costUsd: 0.5 });
  });

  it('an empty key is no key: straight from the CLI to OpenRouter', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = '';
    const r = await completeJson(opts, vi.fn(async () => { throw new Error('exit 1'); }));
    expect(stream).not.toHaveBeenCalled();
    expect(r.data).toEqual({ via: 'openrouter' });
  });
});

/** What the OpenAI client throws for an OpenRouter 401 (13 Nov 2026). */
const userNotFound = () => Object.assign(new Error('401 User not found.'), { status: 401 });

describe('completeJsonClaudeFirst (news sort and group, 19 Nov 2026)', () => {
  const sortOpts = { model: SORT_MODEL, prompt: 'classify', maxTokens: 10, schemaName: 's', schema: { type: 'object' }, label: 'sort', claude: 'sonnet' as const };
  const groupOpts = { ...sortOpts, model: GROUP_MODEL, label: 'group', claude: 'opus' as const };
  const fails = () => vi.fn(async () => { throw new Error('exit 1: boom'); });

  it.each([
    ['sort', sortOpts, 'claude-sonnet-5-5'],
    ['group', groupOpts, 'claude-opus-5-5'],
  ])('%s: the key first, on %s, and nothing else is called', async (_label, o, model) => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce(apiReply('{"via":"key"}'));
    const run = cli('{"via":"claude"}');
    const r = await completeJsonClaudeFirst(o, run);
    expect(r.data).toEqual({ via: 'key' });
    expect(r.costUsd).toBeGreaterThan(0);
    expect(lastRequest().model).toBe(model);
    expect(run).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([['missing', undefined], ['empty', ''], ['blank', '  ']])('key %s: logs the skip once and goes to Claude Code', async (_n, key) => {
    if (key !== undefined) process.env.ANTHROPIC_CREDIT_API_KEY = key;
    const run = cli('{"via":"claude"}');
    const r = await completeJsonClaudeFirst(sortOpts, run);
    await completeJsonClaudeFirst(sortOpts, run);
    expect(r).toEqual({ data: { via: 'claude' }, costUsd: 0, raw: '{"via":"claude"}' });
    expect(stream).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    const [args] = (run as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(['--model', 'sonnet']));
    const skips = log.mock.calls.filter((c: unknown[]) => String(c[0]).includes('Claude API key not set'));
    expect(skips).toEqual([['sort: Claude API key not set (ANTHROPIC_CREDIT_API_KEY), skipping to Claude Code CLI']]);
  });

  it('the key throws: Claude Code', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockRejectedValueOnce(new Error('529 overloaded'));
    const r = await completeJsonClaudeFirst(groupOpts, cli('{"via":"claude"}'));
    expect(r.data).toEqual({ via: 'claude' });
    expect(create).not.toHaveBeenCalled();
  });

  it('the key replies with something that is not JSON: Claude Code, and the key call still counts', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce(apiReply('Sorry, no.', { input_tokens: 1_000_000, output_tokens: 0 }));
    const r = await completeJsonClaudeFirst(sortOpts, cli('{"via":"claude"}'));
    expect(r.data).toEqual({ via: 'claude' });
    expect(r.costUsd).toBeCloseTo(2); // a million Sonnet input tokens
  });

  it('the CLI fails too: OpenRouter, on the call\'s own model', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockRejectedValueOnce(new Error('400 credit balance too low'));
    const r = await completeJsonClaudeFirst(sortOpts, fails());
    expect(r).toMatchObject({ data: { via: 'openrouter' }, costUsd: 0.5 });
    expect(create.mock.calls[0][0].model).toBe(SORT_MODEL);
  });

  it('every provider fails: a clear error naming what was tried', async () => {
    create.mockRejectedValue(userNotFound());
    await expect(completeJsonClaudeFirst(groupOpts, fails()))
      .rejects.toThrow(/group: every provider failed.*Claude API key not set.*Claude Code CLI failed.*OpenRouter: 401 User not found/);
  });

  it('OpenRouter switched off for the run: never called', async () => {
    noteOpenRouterFailure(userNotFound());
    await expect(completeJsonClaudeFirst(sortOpts, fails())).rejects.toThrow(/OpenRouter switched off for this run/);
    expect(create).not.toHaveBeenCalled();
  });

  it('a dead OpenRouter key is only tried once per run', async () => {
    create.mockRejectedValue(userNotFound());
    await expect(completeJsonClaudeFirst(sortOpts, fails())).rejects.toThrow();
    await expect(completeJsonClaudeFirst(sortOpts, fails())).rejects.toThrow();
    expect(create).toHaveBeenCalledOnce();
    expect(openRouterUnavailable()).toMatch(/User not found/);
  });

  it('a switched-off OpenRouter does not leak into the next test', () => {
    expect(openRouterUnavailable()).toBeNull();
  });

  it('a passing outage only switches OpenRouter off after three in a row', async () => {
    create.mockRejectedValue(Object.assign(new Error('503 upstream down'), { status: 503 }));
    for (let i = 0; i < 2; i++) await expect(completeJsonClaudeFirst(sortOpts, fails())).rejects.toThrow();
    expect(openRouterUnavailable()).toBeNull();
    await expect(completeJsonClaudeFirst(sortOpts, fails())).rejects.toThrow();
    expect(openRouterUnavailable()).toMatch(/3 failures in a row/);
  });

  it('resetOpenRouterHealth switches OpenRouter back on', () => {
    noteOpenRouterFailure(userNotFound());
    expect(openRouterUnavailable()).not.toBeNull();
    resetOpenRouterHealth();
    expect(openRouterUnavailable()).toBeNull();
  });

  it('knows a dead key from a passing outage', () => {
    expect(isOpenRouterKeyProblem(userNotFound())).toBe(true);
    expect(isOpenRouterKeyProblem(Object.assign(new Error('Payment Required'), { status: 402 }))).toBe(true);
    expect(isOpenRouterKeyProblem(new Error('Jev 401: {"error":{"message":"User not found."}}'))).toBe(true);
    expect(isOpenRouterKeyProblem(new Error('OPENROUTER_API_KEY is not set'))).toBe(true);
    expect(isOpenRouterKeyProblem(Object.assign(new Error('503 down'), { status: 503 }))).toBe(false);
    expect(isOpenRouterKeyProblem(new Error('Connection error.'))).toBe(false);
  });
});

describe('searchWeb: Claude web search first, OpenRouter as the backup', () => {
  const searchOpts = { blockedDomains: ['youtube.com', 'x.com'], openRouterModel: SORT_MODEL };
  const results = (...urls: string[]) => ({ type: 'web_search_tool_result', tool_use_id: 't', content: urls.map((url) => ({ type: 'web_search_result', url, title: 't' })) });
  const searchReply = (content: object[], searches = 2) => ({
    stop_reason: 'end_turn', content,
    usage: { input_tokens: 10_000, output_tokens: 500, server_tool_use: { web_search_requests: searches, web_fetch_requests: 0 } },
  });

  it('asks Haiku 5.5 with the web_search tool, max_uses and the blocked domains, and reads the result blocks', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce(searchReply([
      { type: 'server_tool_use', id: 't', name: 'web_search', input: { query: 'q' } },
      results('https://a.test/1', 'https://b.test/2'),
      results('https://a.test/1', 'https://c.test/3'),
      { type: 'text', text: 'Here: https://ignored.test/prose' },
    ]));
    const r = await searchWeb('q', searchOpts);
    const req = lastRequest();
    expect(req.model).toBe('claude-haiku-5-5');
    expect(req.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search', max_uses: 3, blocked_domains: ['youtube.com', 'x.com'] }]);
    expect(r.urls).toEqual(['https://a.test/1', 'https://b.test/2', 'https://c.test/3']);
    expect(r.via).toBe('claude-web');
    expect(r.costUsd).toBeCloseTo((10_000 * 0.1 + 500 * 0.5) / 1e6 + 2 * 0.01);
    expect(create).not.toHaveBeenCalled();
  });

  it('caps the URLs at maxResults', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce(searchReply([results('https://a.test/1', 'https://b.test/2', 'https://c.test/3')]));
    expect((await searchWeb('q', { ...searchOpts, maxResults: 2 })).urls).toEqual(['https://a.test/1', 'https://b.test/2']);
  });

  it('skips an error result and keeps the good ones', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce(searchReply([
      { type: 'web_search_tool_result', tool_use_id: 'x', content: { type: 'web_search_tool_result_error', error_code: 'unavailable' } },
      results('https://a.test/1'),
    ]));
    expect((await searchWeb('q', searchOpts)).urls).toEqual(['https://a.test/1']);
    expect(create).not.toHaveBeenCalled();
  });

  const errorOnlyReply = () => searchReply([
    { type: 'web_search_tool_result', tool_use_id: 'x', content: { type: 'web_search_tool_result_error', error_code: 'too_many_requests' } },
  ]);
  const errorOnlyCost = (10_000 * 0.1 + 500 * 0.5) / 1e6 + 2 * 0.01;

  it('only error results: the OpenRouter backup, and the Claude call is still counted', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce(errorOnlyReply());
    create.mockResolvedValueOnce({ choices: [{ message: { annotations: [{ type: 'url_citation', url_citation: { url: 'https://or.test/1' } }] } }], usage: { cost: 0.02 } });
    const r = await searchWeb('q', searchOpts);
    expect(r.urls).toEqual(['https://or.test/1']);
    expect(r.via).toBe('openrouter-web');
    expect(r.costUsd).toBeCloseTo(0.02 + errorOnlyCost);
  });

  it('only error results and the backup fails too: the thrown error carries the Claude cost', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce(errorOnlyReply());
    create.mockRejectedValueOnce(userNotFound());
    const e = await searchWeb('q', searchOpts).catch((err: unknown) => err);
    expect((e as Error).message).toMatch(/every search provider failed.*too_many_requests.*User not found/);
    expect(errorCostUsd(e)).toBeCloseTo(errorOnlyCost);
  });

  it('both fail before anything is billed: the error carries 0', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockRejectedValueOnce(new Error('529 overloaded'));
    create.mockRejectedValueOnce(userNotFound());
    expect(errorCostUsd(await searchWeb('q', searchOpts).catch((err: unknown) => err))).toBe(0);
  });

  it.each([['missing', undefined], ['empty', '']])('key %s: logs the skip and uses the OpenRouter backup', async (_n, key) => {
    if (key !== undefined) process.env.ANTHROPIC_CREDIT_API_KEY = key;
    create.mockResolvedValueOnce({ choices: [{ message: { annotations: [{ type: 'url_citation', url_citation: { url: 'https://or.test/1' } }] } }], usage: { cost: 0.02 } });
    const r = await searchWeb('q', searchOpts);
    expect(stream).not.toHaveBeenCalled();
    expect(r.urls).toEqual(['https://or.test/1']);
    expect(create.mock.calls[0][0].model).toBe(SORT_MODEL);
    expect(log).toHaveBeenCalledWith('search: Claude API key not set (ANTHROPIC_CREDIT_API_KEY), skipping to OpenRouter web search');
  });

  it('both fail: throws, and once OpenRouter is switched off it is not called again', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockRejectedValue(new Error('529 overloaded'));
    create.mockRejectedValueOnce(userNotFound());
    await expect(searchWeb('q', searchOpts)).rejects.toThrow(/every search provider failed.*529 overloaded.*User not found/);
    await expect(searchWeb('q', searchOpts)).rejects.toThrow(/switched off for this run/);
    expect(create).toHaveBeenCalledOnce();
  });
});

describe('what a Claude API call costs', () => {
  it.each([
    ['claude-haiku-5-5', 0.1, 0.5],
    ['claude-sonnet-5-5', 2, 10],
    ['claude-opus-5-5', 4, 20],
    ['claude-unknown-9', 4, 20], // unknown: priced as Opus, to be safe
  ])('%s at $%s / $%s per million', (model, inP, outP) => {
    expect(claudeCostUsd(model, { input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBeCloseTo(inP + outP);
  });

  it('counts cache writes and reads as input, and adds $10 per 1,000 web searches', () => {
    const u = { input_tokens: 500_000, cache_creation_input_tokens: 300_000, cache_read_input_tokens: 200_000, output_tokens: 0, server_tool_use: { web_search_requests: 3 } };
    expect(claudeCostUsd('claude-sonnet-5-5', u)).toBeCloseTo(2 + 0.03);
  });

  it('a Claude Code (subscription) call costs 0', async () => {
    const r = await completeJsonClaudeFirst({ ...opts, label: 'sort' }, cli('{"ok":true}'));
    expect(r.costUsd).toBe(0);
  });
});

describe('is an LLM configured? (empty secrets count as unset)', () => {
  it('needs the Claude key or the OpenRouter key, not blank strings', () => {
    process.env.OPENROUTER_API_KEY = '';
    process.env.ANTHROPIC_CREDIT_API_KEY = ' ';
    expect(claudeApiKey()).toBeNull();
    expect(llmConfigured()).toBe(false);
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    expect(llmConfigured()).toBe(true);
    delete process.env.ANTHROPIC_CREDIT_API_KEY;
    process.env.OPENROUTER_API_KEY = 'k';
    expect(llmConfigured()).toBe(true);
  });
});
