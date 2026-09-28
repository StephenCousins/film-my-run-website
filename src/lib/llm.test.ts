import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const create = vi.fn();
vi.mock('openai', () => ({ default: class { chat = { completions: { create } }; } }));

import { completeJson, type ClaudeRunner } from './llm';
import { WRITE_MODEL, SORT_MODEL } from './news/models';

const opts = { model: WRITE_MODEL, prompt: 'hi', maxTokens: 10, schemaName: 's', schema: { type: 'object' } };
const cli = (result: string, extra = {}): ClaudeRunner => vi.fn(async () => JSON.stringify({ is_error: false, result, ...extra }));

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'k';
  process.env.CLAUDE_CODE_OAUTH_TOKEN = 't';
  create.mockReset().mockResolvedValue({ choices: [{ message: { content: '{"via":"openrouter"}' } }], usage: { cost: 0.5 } });
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { delete process.env.CLAUDE_CODE_OAUTH_TOKEN; vi.restoreAllMocks(); });

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
