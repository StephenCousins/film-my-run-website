import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { CHECK_MODEL, WRITE_MODEL } from './news/models';

/**
 * LLM calls for the Shoe Finder, routed through OpenRouter.
 *
 * These are small, mechanical jobs — pull JSON out of a search snippet, score a
 * review, answer yes/no — so they run on a cheap model rather than a frontier
 * one. Gemini 2.5 Flash Lite is ~10x cheaper per input token than Claude Haiku
 * 4.5 ($0.10/$0.40 per MTok vs $1.00/$5.00) and holds up on the two things this
 * code actually needs: following a "reply with ONLY JSON" instruction, and
 * short structured answers. It also accepts images, so the shoe image
 * verification can move here later without another provider change.
 *
 * Override with OPENROUTER_MODEL if a different model suits better.
 */
const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';

/**
 * For work where the writing itself is the product — race scripts, news
 * stories in a particular voice — rather than pulling fields out of text.
 * DeepSeek V3.2 is $0.269/$0.400 per MTok against Claude Opus 4.8's
 * $5.00/$25.00, so a 4k-token piece costs about a sixth of a penny instead
 * of ten pence, and it holds a voice far better than a flash-tier model.
 */
export const WRITING_MODEL = 'deepseek/deepseek-v3.2';

export function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    // OpenRouter attributes usage to your app with these; both are optional.
    defaultHeaders: {
      'HTTP-Referer': 'https://filmmyrun.com',
      'X-Title': 'Film My Run',
    },
  });
}

export interface CompleteOptions {
  prompt: string;
  maxTokens: number;
  /** Optional system prompt, sent as a leading system message. */
  system?: string;
  /** Low by default — every caller here wants a deterministic, parseable answer. */
  temperature?: number;
  model?: string;
}

/**
 * Judgement calls where a wrong answer costs us (is this review about exactly
 * this shoe version? is this the right shoe photo?). On the Anthropic credit
 * they run on Sonnet 5.5; the OpenRouter fallback is a step up from the default.
 */
export const JUDGE_MODEL = 'google/gemini-3.7-flash';

/**
 * Calls go to Claude directly first, on the monthly API credit included with
 * Stephen's Max plan ($100/month, expires unused; 10 Nov 2026). Null means
 * "use OpenRouter": no ANTHROPIC_CREDIT_API_KEY, credit used up (a 400), any
 * other API error, or a reply that didn't finish. The old ANTHROPIC_API_KEY on
 * Railway is deliberately not used.
 */
type ClaudeRoute = { model: string; effort: 'low' | 'medium' };
const CLAUDE_WRITER: ClaudeRoute = { model: 'claude-opus-5-5', effort: 'medium' };
const CLAUDE_ROUTES: Record<string, ClaudeRoute> = {
  [WRITING_MODEL]: CLAUDE_WRITER,
  [WRITE_MODEL]: CLAUDE_WRITER, // CHECK_MODEL is the same model id
  [JUDGE_MODEL]: { model: 'claude-sonnet-5-5', effort: 'medium' },
};
const CLAUDE_CHEAP: ClaudeRoute = { model: 'claude-haiku-5-5', effort: 'low' };

async function completeViaClaude(
  route: ClaudeRoute,
  { prompt, maxTokens, system }: CompleteOptions,
  extra: { imageUrl?: string; schema?: object } = {},
): Promise<string | null> {
  if (!process.env.ANTHROPIC_CREDIT_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_CREDIT_API_KEY, maxRetries: 1 });
    const message = await client.messages
      .stream({
        model: route.model,
        // Thinking counts against max_tokens, so leave room above the reply's own cap.
        max_tokens: maxTokens + 8000,
        output_config: {
          effort: route.effort,
          ...(extra.schema ? { format: { type: 'json_schema' as const, schema: extra.schema as Record<string, unknown> } } : {}),
        },
        ...(system ? { system } : {}),
        messages: [{
          role: 'user',
          content: extra.imageUrl
            ? [{ type: 'image', source: { type: 'url', url: extra.imageUrl } }, { type: 'text', text: prompt }]
            : prompt,
        }],
      })
      .finalMessage();
    if (message.stop_reason !== 'end_turn') throw new Error(`stop_reason ${message.stop_reason}`);
    const text = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    if (!text) throw new Error('empty reply');
    console.log(`claude-credit ok (${route.model})`);
    return text;
  } catch (e) {
    console.log(`claude-credit failed (${route.model}): ${(e as Error).message.split('\n')[0].slice(0, 200)}, trying the next route`);
    return null;
  }
}

/**
 * Single-turn completion returning plain text.
 *
 * Mirrors how the Anthropic calls it replaced were used: one user message in,
 * the first text block out. Returns '' rather than throwing when the model
 * gives back nothing, so callers keep their existing "empty means skip"
 * handling.
 */
export async function completeText({
  prompt,
  maxTokens,
  system,
  temperature = 0,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
}: CompleteOptions): Promise<string> {
  const viaClaude = await completeViaClaude(CLAUDE_ROUTES[model] ?? CLAUDE_CHEAP, { prompt, maxTokens, system });
  if (viaClaude !== null) return viaClaude;

  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      { role: 'user' as const, content: prompt },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

/**
 * Single-turn completion over an image URL, returning plain text.
 *
 * Used to check that a candidate shoe photo is a clean product shot. The model
 * fetches the URL itself, so nothing is downloaded server-side.
 */
export async function completeTextWithImage({
  prompt,
  imageUrl,
  maxTokens,
  temperature = 0,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
}: CompleteOptions & { imageUrl: string }): Promise<string> {
  const viaClaude = await completeViaClaude(CLAUDE_ROUTES[model] ?? CLAUDE_CHEAP, { prompt, maxTokens }, { imageUrl });
  if (viaClaude !== null) return viaClaude;

  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

/** JSON from a model reply: plain or in a ```json fence; null when it isn't JSON. */
export function parseJson<T>(raw: string): T | null {
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    return null;
  }
}

/**
 * A structured reply and what it cost. OpenRouter reports the cost of each
 * call when asked (`usage: { include: true }`), so the news pipeline can keep
 * to its monthly ceiling on real figures, not estimates.
 */
export interface JsonCallOptions {
  model: string;
  prompt: string;
  system?: string;
  maxTokens: number;
  temperature?: number;
  schemaName: string;
  schema: object;
}

/** Runs the `claude` CLI with `args`, feeding `stdin`; resolves stdout, rejects on a non-zero exit or timeout. */
export type ClaudeRunner = (args: string[], stdin: string, timeoutMs: number) => Promise<string>;

const runClaude: ClaudeRunner = (args, stdin, timeoutMs) =>
  new Promise((resolve, reject) => {
    // tmpdir: keep the repo's CLAUDE.md out of the model's context.
    const child = spawn('claude', args, { cwd: tmpdir(), timeout: timeoutMs, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject); // ENOENT when the CLI isn't installed
    child.on('close', (code, signal) => {
      if (signal) reject(new Error(`killed by ${signal} (timeout?)`));
      else if (code !== 0) {
        // The CLI prints a JSON envelope even on failure; its `result` holds the reason.
        let why = (err || out).trim();
        try { const j = JSON.parse(out); why = String(j.result ?? j.error ?? why); } catch {}
        reject(new Error(`exit ${code}: ${why.slice(0, 300)}`));
      }
      else resolve(out);
    });
    child.stdin.on('error', () => {}); // EPIPE if it dies early; 'close' reports why
    child.stdin.end(stdin);
  });

/**
 * The same JSON call through Claude Code headless (`claude -p`), on the owner's
 * subscription via CLAUDE_CODE_OAUTH_TOKEN. Null means "try the next route":
 * CLI missing, error, timeout, usage limit, or a reply that isn't JSON.
 * `cliModel` is the CLI's model alias: opus for writing and checking, sonnet
 * when it stands in for the cheap news sorter.
 * Cost is 0: the subscription has no marginal cost, and the news ceiling must
 * count only real OpenRouter spend.
 */
export async function completeJsonViaClaude<T>(
  { prompt, system, schema }: JsonCallOptions,
  run: ClaudeRunner = runClaude,
  cliModel = 'opus',
): Promise<{ data: T; costUsd: number; raw: string } | null> {
  const args = [
    '-p',
    '--model', cliModel,
    '--output-format', 'json',
    '--tools', '',
    '--system-prompt', system || 'You are a careful writer and fact-checker. Follow the instructions exactly.',
    '--no-session-persistence',
    '--strict-mcp-config',
    '--setting-sources', '',
  ];
  const input = `${prompt}\n\nReply with ONLY a JSON object matching this JSON schema. No prose, no code fences.\n${JSON.stringify(schema)}`;
  try {
    const out = JSON.parse(await run(args, input, 180_000)) as { is_error?: boolean; result?: string; subtype?: string };
    if (out.is_error || typeof out.result !== 'string') throw new Error(`${out.subtype ?? 'error'}: ${String(out.result ?? '').slice(0, 200)}`);
    const raw = out.result.trim();
    const data = parseJson<T>(raw);
    if (data === null) throw new Error('reply was not JSON');
    console.log(`claude-cli ok (${cliModel})`);
    return { data, costUsd: 0, raw };
  } catch (e) {
    console.log(`claude-cli failed (${cliModel}): ${(e as Error).message.split('\n')[0].slice(0, 200)}, trying the next route`);
    return null;
  }
}

export async function completeJson<T>(
  opts: JsonCallOptions,
  run: ClaudeRunner = runClaude,
): Promise<{ data: T | null; costUsd: number; raw: string }> {
  const { model, prompt, system, maxTokens, schema } = opts;
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN && (model === WRITE_MODEL || model === CHECK_MODEL)) {
    const viaClaude = await completeJsonViaClaude<T>(opts, run);
    if (viaClaude) return viaClaude;
  }
  // Writing and checking (news, runner profiles) next try the API credit, so a
  // run without the subscription token, or past its usage limit, still avoids
  // paying OpenRouter for Opus. Sorting and grouping use completeJsonOpenRouterFirst.
  if (model === WRITE_MODEL || model === CHECK_MODEL) {
    const raw = await completeViaClaude(CLAUDE_WRITER, { prompt, system, maxTokens }, { schema });
    const data = raw === null ? null : parseJson<T>(raw);
    if (data !== null) return { data, costUsd: 0, raw: raw! };
  }
  return completeJsonViaOpenRouter<T>(opts);
}

/** The plain OpenRouter JSON call, with structured output and its real cost. Throws on an API error. */
async function completeJsonViaOpenRouter<T>(
  { model, prompt, system, maxTokens, temperature = 0, schemaName, schema }: JsonCallOptions,
): Promise<{ data: T | null; costUsd: number; raw: string }> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      { role: 'user' as const, content: prompt },
    ],
    response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema: schema as Record<string, unknown> } },
    // OpenRouter-only field: include the call's cost in `usage.cost`.
    ...({ usage: { include: true } } as Record<string, unknown>),
  });
  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  const costUsd = Number((completion.usage as { cost?: number } | undefined)?.cost ?? 0);
  return { data: parseJson<T>(raw), costUsd, raw };
}

/*
 * Is OpenRouter usable in this run?
 *
 * On 13 Nov 2026 the OpenRouter key died (401 "User not found") and the news run
 * stopped at the sort. The news sort, group and search now fall back to Claude
 * when OpenRouter fails, and this switch stops them waiting on a dead key for
 * every remaining item:
 * - a key or billing problem (401, 402, "User not found", key missing, out of
 *   credit) switches OpenRouter off straight away;
 * - anything else (a 5xx, a timeout, no connection) is let through per item, but
 *   three in a row switch it off too, so a hanging OpenRouter can't eat the run.
 * One success resets the count. runNews() calls resetOpenRouterHealth() at the
 * start of every run, so one bad run doesn't carry over to the next.
 */
let openRouterOff: string | null = null;
let openRouterFailsInARow = 0;
const OPENROUTER_FAILS_BEFORE_OFF = 3;

/** Turns OpenRouter back on and clears the failure count (start of every news run, and tests). */
export function resetOpenRouterHealth(): void {
  openRouterOff = null;
  openRouterFailsInARow = 0;
}

/** Why OpenRouter was switched off for this run, or null when it is still in use. */
export function openRouterUnavailable(): string | null {
  return openRouterOff;
}

/** A dead or unpaid key, as opposed to a passing outage: retrying won't help. */
export function isOpenRouterKeyProblem(e: unknown): boolean {
  const status = (e as { status?: unknown })?.status;
  if (status === 401 || status === 402) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /\b40[12]\b|user not found|invalid api key|no auth|OPENROUTER_API_KEY is not set|payment required|insufficient credits|credits? (exhausted|used up)/i.test(msg);
}

/** First line of an error, short, for the log. Never includes request headers, so no key. */
function shortError(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 200);
}

/** Record an OpenRouter failure; switches OpenRouter off for the run when it should. */
export function noteOpenRouterFailure(e: unknown): void {
  openRouterFailsInARow += 1;
  if (openRouterOff) return;
  if (isOpenRouterKeyProblem(e)) openRouterOff = `key or billing problem: ${shortError(e)}`;
  else if (openRouterFailsInARow >= OPENROUTER_FAILS_BEFORE_OFF) openRouterOff = `${openRouterFailsInARow} failures in a row, last: ${shortError(e)}`;
  if (openRouterOff) console.warn(`OpenRouter switched off for the rest of this run (${openRouterOff})`);
}

/** Record an OpenRouter success: the failure count starts again. */
export function noteOpenRouterSuccess(): void {
  openRouterFailsInARow = 0;
}

/** Which Claude to use when OpenRouter can't: the CLI alias and the matching API-credit model. */
const CLAUDE_FALLBACK = {
  sonnet: { cli: 'sonnet', credit: { model: 'claude-sonnet-5-5', effort: 'medium' } as ClaudeRoute },
  opus: { cli: 'opus', credit: CLAUDE_WRITER },
};

/**
 * For the cheap, tuned news jobs (sort and group): OpenRouter first, as before,
 * and only when OpenRouter fails (or is switched off for the run, see above)
 * Claude Code headless on the subscription, then the Anthropic credit if
 * ANTHROPIC_CREDIT_API_KEY is set. Same prompt and JSON schema throughout.
 * Throws a clear error when every route fails.
 *
 * `label` names the stage in the log ("sort", "group"); `claude` picks which
 * Claude stands in. A reply that isn't JSON from OpenRouter is not a failure:
 * it comes back as data null, as it always has.
 */
export async function completeJsonOpenRouterFirst<T>(
  opts: JsonCallOptions & { label: string; claude?: keyof typeof CLAUDE_FALLBACK },
  run: ClaudeRunner = runClaude,
): Promise<{ data: T | null; costUsd: number; raw: string }> {
  const { label, model, prompt, maxTokens, schema } = opts;
  const fallback = CLAUDE_FALLBACK[opts.claude ?? 'sonnet'];
  const system = opts.system || 'You sort and group running news for a news desk. Follow the instructions exactly.';
  const tried: string[] = [];

  const off = openRouterUnavailable();
  if (off) tried.push(`OpenRouter switched off for this run (${off})`);
  else {
    try {
      const r = await completeJsonViaOpenRouter<T>(opts);
      noteOpenRouterSuccess();
      console.log(`${label}: openrouter-${model.split('/').pop()?.split('-')[0] ?? model}`);
      return r;
    } catch (e) {
      noteOpenRouterFailure(e);
      console.warn(`${label}: OpenRouter failed (${shortError(e)}), trying Claude`);
      tried.push(`OpenRouter: ${shortError(e)}`);
    }
  }

  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    const viaCli = await completeJsonViaClaude<T>({ ...opts, system }, run, fallback.cli);
    if (viaCli) {
      console.log(`${label}: claude-cli`);
      return viaCli;
    }
    tried.push('Claude Code CLI failed (see log above)');
  } else tried.push('Claude Code CLI not set up (no CLAUDE_CODE_OAUTH_TOKEN)');

  if (process.env.ANTHROPIC_CREDIT_API_KEY) {
    const raw = await completeViaClaude(fallback.credit, { prompt, system, maxTokens }, { schema });
    const data = raw === null ? null : parseJson<T>(raw);
    if (data !== null) {
      console.log(`${label}: claude-credit`);
      return { data, costUsd: 0, raw: raw! };
    }
    tried.push(raw === null ? 'Anthropic credit failed (see log above)' : 'Anthropic credit reply was not JSON');
  } else tried.push('Anthropic credit not set up (no ANTHROPIC_CREDIT_API_KEY)');

  throw new Error(`${label}: every provider failed. ${tried.join('; ')}`);
}

/**
 * A web search through OpenRouter's web plugin: the URLs a cheap model cites
 * for a query, and what it cost (5 results is about $0.02 plus the model).
 * The news pipeline uses it to find more reports of an event when its own
 * feed source can't be read.
 */
export async function searchWeb(model: string, query: string, maxResults = 5): Promise<{ urls: string[]; costUsd: number }> {
  // Throws when OpenRouter is switched off for the run or the call fails; the
  // news caller (moreCoverage) treats that as "no extra coverage" and carries on.
  const off = openRouterUnavailable();
  if (off) throw new Error(`OpenRouter switched off for this run (${off})`);
  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await getClient().chat.completions.create({
      model,
      max_tokens: 2000,
      temperature: 0,
      messages: [{ role: 'user', content: `Find recent news reports of: ${query}. List the article URLs.` }],
      ...({ plugins: [{ id: 'web', engine: 'exa', max_results: maxResults }], usage: { include: true } } as Record<string, unknown>),
    });
  } catch (e) {
    noteOpenRouterFailure(e);
    throw e;
  }
  noteOpenRouterSuccess();
  const message = completion.choices[0]?.message as { annotations?: { type: string; url_citation?: { url: string } }[] } | undefined;
  const urls = [...new Set((message?.annotations ?? []).filter((a) => a.type === 'url_citation' && a.url_citation?.url).map((a) => a.url_citation!.url))];
  return { urls, costUsd: Number((completion.usage as { cost?: number } | undefined)?.cost ?? 0) };
}
