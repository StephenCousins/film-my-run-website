import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const create = vi.fn();
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));
const finalMessage = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { stream: () => ({ finalMessage }) }; } }));

import {
  completeJson, completeJsonOpenRouterFirst, isOpenRouterKeyProblem, noteOpenRouterFailure, openRouterUnavailable,
  resetOpenRouterHealth, searchWeb, type ClaudeRunner,
} from './llm';
import { WRITE_MODEL, SORT_MODEL } from './news/models';

const opts = { model: WRITE_MODEL, prompt: 'hi', maxTokens: 10, schemaName: 's', schema: { type: 'object' } };
const cli = (result: string, extra = {}): ClaudeRunner => vi.fn(async () => JSON.stringify({ is_error: false, result, ...extra }));

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'k';
  process.env.CLAUDE_CODE_OAUTH_TOKEN = 't';
  create.mockReset().mockResolvedValue({ choices: [{ message: { content: '{"via":"openrouter"}' } }], usage: { cost: 0.5 } });
  finalMessage.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
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

/** What the OpenAI client throws for an OpenRouter 401 (13 Nov 2026). */
const userNotFound = () => Object.assign(new Error('401 User not found.'), { status: 401 });

describe('completeJsonOpenRouterFirst (news sort and group)', () => {
  const sortOpts = { model: SORT_MODEL, prompt: 'classify', maxTokens: 10, schemaName: 's', schema: { type: 'object' }, label: 'sort' };
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });

  it('uses OpenRouter and never Claude when OpenRouter works', async () => {
    const run = cli('{"via":"claude"}');
    const r = await completeJsonOpenRouterFirst(sortOpts, run);
    expect(r).toMatchObject({ data: { via: 'openrouter' }, costUsd: 0.5 });
    expect(run).not.toHaveBeenCalled();
    expect(finalMessage).not.toHaveBeenCalled();
  });

  it('falls back to Claude Code (Sonnet) on an OpenRouter 401 and switches OpenRouter off', async () => {
    create.mockRejectedValue(userNotFound());
    const run = cli('{"via":"claude"}');
    const r = await completeJsonOpenRouterFirst({ ...sortOpts, claude: 'sonnet' }, run);
    expect(r).toEqual({ data: { via: 'claude' }, costUsd: 0, raw: '{"via":"claude"}' });
    const [args] = (run as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args).toEqual(expect.arrayContaining(['--model', 'sonnet']));
    expect(openRouterUnavailable()).toMatch(/User not found/);
  });

  it('does not call OpenRouter again in the same run once the key is dead', async () => {
    create.mockRejectedValue(userNotFound());
    const run = cli('{"via":"claude"}');
    await completeJsonOpenRouterFirst(sortOpts, run);
    await completeJsonOpenRouterFirst(sortOpts, run);
    await completeJsonOpenRouterFirst({ ...sortOpts, label: 'group' }, run);
    expect(create).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('a switched-off OpenRouter does not leak into the next test', async () => {
    expect(openRouterUnavailable()).toBeNull();
    const run = cli('{"via":"claude"}');
    await completeJsonOpenRouterFirst(sortOpts, run);
    expect(create).toHaveBeenCalledOnce();
    expect(run).not.toHaveBeenCalled();
  });

  it('resetOpenRouterHealth switches OpenRouter back on', async () => {
    noteOpenRouterFailure(userNotFound());
    expect(openRouterUnavailable()).not.toBeNull();
    resetOpenRouterHealth();
    expect(openRouterUnavailable()).toBeNull();
  });

  it('a passing outage falls back per item, and only three in a row switch OpenRouter off', async () => {
    create.mockRejectedValue(Object.assign(new Error('503 upstream down'), { status: 503 }));
    const run = cli('{"via":"claude"}');
    await completeJsonOpenRouterFirst(sortOpts, run);
    await completeJsonOpenRouterFirst(sortOpts, run);
    expect(openRouterUnavailable()).toBeNull();
    await completeJsonOpenRouterFirst(sortOpts, run);
    expect(openRouterUnavailable()).toMatch(/3 failures in a row/);
    await completeJsonOpenRouterFirst(sortOpts, run);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('tries the Anthropic credit when the CLI fails too', async () => {
    create.mockRejectedValue(userNotFound());
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    finalMessage.mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"via":"credit"}' }] });
    const run = vi.fn(async () => { throw new Error('exit 1: usage limit'); });
    const r = await completeJsonOpenRouterFirst(sortOpts, run);
    expect(r).toEqual({ data: { via: 'credit' }, costUsd: 0, raw: '{"via":"credit"}' });
    expect(run).toHaveBeenCalledOnce();
  });

  it('throws a clear error when every provider fails', async () => {
    create.mockRejectedValue(userNotFound());
    const run = vi.fn(async () => { throw new Error('exit 1: boom'); });
    await expect(completeJsonOpenRouterFirst({ ...sortOpts, label: 'group' }, run))
      .rejects.toThrow(/group: every provider failed.*User not found.*Claude Code CLI failed.*no ANTHROPIC_CREDIT_API_KEY/);
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

describe('searchWeb and the OpenRouter switch', () => {
  it('fails fast without calling OpenRouter once it is switched off', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    create.mockRejectedValueOnce(userNotFound());
    await expect(searchWeb(SORT_MODEL, 'q')).rejects.toThrow(/User not found/);
    await expect(searchWeb(SORT_MODEL, 'q')).rejects.toThrow(/switched off for this run/);
    expect(create).toHaveBeenCalledOnce();
  });
});
