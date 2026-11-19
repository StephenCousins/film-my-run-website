import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { CHECK_MODEL, WRITE_MODEL } from './news/models';
import { claudeCostUsd } from './llm-prices';

/**
 * LLM calls for the site and the news pipeline. Claude on the API key
 * (ANTHROPIC_CREDIT_API_KEY) is tried first almost everywhere, OpenRouter is
 * the backup; the per-job order is in docs/llm.md. The notes below are about
 * the OpenRouter models.
 *
 * Originally the Shoe Finder's calls, routed through OpenRouter.
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

/**
 * The Claude API key, or null when it is missing, empty or blank. GitHub passes
 * an unset secret as '', so an empty key must count as "not set", not as a key.
 */
export function claudeApiKey(): string | null {
  return process.env.ANTHROPIC_CREDIT_API_KEY?.trim() || null;
}

/** Is any LLM route configured (the Claude key or OpenRouter)? */
export function llmConfigured(): boolean {
  return !!(claudeApiKey() || process.env.OPENROUTER_API_KEY?.trim());
}

/*
 * "Claude API key not set" is logged once per stage per run, not once per item
 * (a run sorts dozens). resetOpenRouterHealth() clears it with the rest of the
 * per-run state.
 */
const keySkipLogged = new Set<string>();
function logKeySkip(label: string, next: string): void {
  if (keySkipLogged.has(label)) return;
  keySkipLogged.add(label);
  console.log(`${label}: Claude API key not set (ANTHROPIC_CREDIT_API_KEY), skipping to ${next}`);
}

async function completeViaClaude(
  route: ClaudeRoute,
  opts: CompleteOptions,
  extra: { imageUrl?: string; schema?: object } = {},
): Promise<string | null> {
  return (await completeViaClaudeCosted(route, opts, extra))?.text ?? null;
}

/** completeViaClaude plus what the call cost (llm-prices.ts), for the news pipeline's ceiling. */
async function completeViaClaudeCosted(
  route: ClaudeRoute,
  { prompt, maxTokens, system }: CompleteOptions,
  extra: { imageUrl?: string; schema?: object } = {},
): Promise<{ text: string; costUsd: number } | null> {
  const apiKey = claudeApiKey();
  if (!apiKey) return null;
  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
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
    return { text, costUsd: claudeCostUsd(route.model, message.usage) };
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
 * `cliModel` is the CLI's model alias: opus for writing, checking and grouping,
 * sonnet for the news sorter.
 * Cost is 0: the subscription has no marginal cost, and the news ceiling must
 * count only real spend (OpenRouter and the Claude API key).
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
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim() && (model === WRITE_MODEL || model === CHECK_MODEL)) {
    const viaClaude = await completeJsonViaClaude<T>(opts, run);
    if (viaClaude) return viaClaude;
  }
  // Writing and checking (news, runner profiles) next try the Claude API key, so a
  // run without the subscription token, or past its usage limit, still avoids
  // paying OpenRouter for Opus. Its real cost counts against the news ceiling.
  // Sorting and grouping use completeJsonClaudeFirst.
  let spent = 0; // a paid key reply that wasn't JSON still counts
  if (model === WRITE_MODEL || model === CHECK_MODEL) {
    if (!claudeApiKey()) logKeySkip('write', 'OpenRouter');
    const r = await completeViaClaudeCosted(CLAUDE_WRITER, { prompt, system, maxTokens }, { schema });
    const data = r === null ? null : parseJson<T>(r.text);
    if (data !== null) return { data, costUsd: r!.costUsd, raw: r!.text };
    spent = r?.costUsd ?? 0;
  }
  const o = await completeJsonViaOpenRouter<T>(opts);
  return { ...o, costUsd: o.costUsd + spent };
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
 * stopped at the sort. Since 19 Nov 2026 the news sort, group and search try
 * Claude first and keep OpenRouter as the last resort; this switch stops them
 * waiting on a dead key for every remaining item when they do reach it:
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
  keySkipLogged.clear(); // and say "Claude API key not set" again, once, next run
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

/**
 * Which Claude does a news job: the API model on the key and the matching CLI alias.
 * The sort runs per item, so it asks for low effort: a classification needs little
 * thinking, and thinking tokens are billed as output.
 */
const CLAUDE_FIRST = {
  sonnet: { api: { model: 'claude-sonnet-5-5', effort: 'low' } as ClaudeRoute, cli: 'sonnet' },
  opus: { api: CLAUDE_WRITER, cli: 'opus' },
};

/**
 * For the news sort and group (19 Nov 2026, Stephen: Claude first, OpenRouter
 * only as a backup): the Claude API key (ANTHROPIC_CREDIT_API_KEY), then Claude
 * Code headless on the subscription, then OpenRouter on the call's own model
 * unless it is switched off for the run (see above). Same prompt and JSON schema
 * throughout. Throws a clear error when every route fails.
 *
 * `label` names the stage in the log ("sort", "group"); `claude` picks which
 * Claude. A Claude reply that isn't JSON falls through to the next route; one
 * from OpenRouter, the last route, comes back as data null, as it always has.
 * Key calls return their real cost (llm-prices.ts); CLI calls cost 0.
 */
export async function completeJsonClaudeFirst<T>(
  opts: JsonCallOptions & { label: string; claude?: keyof typeof CLAUDE_FIRST },
  run: ClaudeRunner = runClaude,
): Promise<{ data: T | null; costUsd: number; raw: string }> {
  const { label, model, prompt, maxTokens, schema } = opts;
  const claude = CLAUDE_FIRST[opts.claude ?? 'sonnet'];
  const system = opts.system || 'You sort and group running news for a news desk. Follow the instructions exactly.';
  const tried: string[] = [];
  let spent = 0; // a paid key reply that wasn't JSON still counts

  if (claudeApiKey()) {
    const r = await completeViaClaudeCosted(claude.api, { prompt, system, maxTokens }, { schema });
    const data = r === null ? null : parseJson<T>(r.text);
    if (data !== null) {
      console.log(`${label}: claude-api (${claude.api.model})`);
      return { data, costUsd: r!.costUsd, raw: r!.text };
    }
    spent = r?.costUsd ?? 0;
    tried.push(r === null ? 'Claude API key failed (see log above)' : 'Claude API key reply was not JSON');
  } else {
    logKeySkip(label, 'Claude Code CLI');
    tried.push('Claude API key not set (ANTHROPIC_CREDIT_API_KEY)');
  }

  if (process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim()) {
    const viaCli = await completeJsonViaClaude<T>({ ...opts, system }, run, claude.cli);
    if (viaCli) {
      console.log(`${label}: claude-cli`);
      return { ...viaCli, costUsd: spent };
    }
    tried.push('Claude Code CLI failed (see log above)');
  } else tried.push('Claude Code CLI not set up (no CLAUDE_CODE_OAUTH_TOKEN)');

  const off = openRouterUnavailable();
  if (off) tried.push(`OpenRouter switched off for this run (${off})`);
  else {
    try {
      const r = await completeJsonViaOpenRouter<T>(opts);
      noteOpenRouterSuccess();
      console.log(`${label}: openrouter-${model.split('/').pop()?.split('-')[0] ?? model}`);
      return { ...r, costUsd: r.costUsd + spent };
    } catch (e) {
      noteOpenRouterFailure(e);
      console.warn(`${label}: OpenRouter failed (${shortError(e)})`);
      tried.push(`OpenRouter: ${shortError(e)}`);
    }
  }

  throw new Error(`${label}: every provider failed. ${tried.join('; ')}`);
}

/** The search runs on Haiku: it only has to search and stop, and the results come back as structured blocks. */
export const SEARCH_CLAUDE_MODEL = 'claude-haiku-5-5';
/** Searches one call may run. Each is $0.01 on top of tokens (llm-prices.ts). */
const SEARCH_MAX_USES = 3;

export interface SearchOptions {
  maxResults?: number;
  /** Bare domains (no scheme or path) never to return; subdomains are covered too. */
  blockedDomains?: readonly string[];
  /** The OpenRouter backup's model. */
  openRouterModel: string;
}
export interface SearchResult { urls: string[]; costUsd: number; via: 'claude-web' | 'openrouter-web' }

/**
 * A web search for news reports: the result URLs and what the search cost.
 * The news pipeline uses it to find more reports of an event when its own
 * feed source can't be read. Since 19 Nov 2026: Anthropic's server-side
 * web_search tool on the Claude API key first, OpenRouter's web plugin as the
 * backup. A Claude search that ran but got only error results still costs
 * money: that cost is added to the backup's. Throws when both fail, with what
 * was spent on the error (errorCostUsd); moreCoverage treats that as "no extra
 * coverage", counts the cost, and the run carries on.
 */
export async function searchWeb(query: string, opts: SearchOptions): Promise<SearchResult> {
  const maxResults = opts.maxResults ?? 5;
  const tried: string[] = [];
  // A Claude search that ran but returned only error results was still billed.
  let spent = 0;
  if (claudeApiKey()) {
    try {
      return await searchViaClaude(query, maxResults, opts.blockedDomains ?? []);
    } catch (e) {
      spent = errorCostUsd(e);
      console.warn(`search: Claude web search failed (${shortError(e)}), trying OpenRouter`);
      tried.push(`Claude web search: ${shortError(e)}`);
    }
  } else {
    logKeySkip('search', 'OpenRouter web search');
    tried.push('Claude API key not set (ANTHROPIC_CREDIT_API_KEY)');
  }
  try {
    const r = await searchViaOpenRouter(query, maxResults, opts.openRouterModel);
    return { ...r, costUsd: r.costUsd + spent };
  } catch (e) {
    tried.push(`OpenRouter: ${shortError(e)}`);
    // The error carries what was spent (errorCostUsd reads it) so the caller can still count it.
    throw Object.assign(new Error(`every search provider failed. ${tried.join('; ')}`), { costUsd: spent });
  }
}

/** The cost a failed call attached to its error (searchWeb does this), else 0. */
export function errorCostUsd(e: unknown): number {
  const c = (e as { costUsd?: unknown } | null)?.costUsd;
  return typeof c === 'number' && Number.isFinite(c) ? c : 0;
}

async function searchViaClaude(query: string, maxResults: number, blockedDomains: readonly string[]): Promise<SearchResult> {
  const client = new Anthropic({ apiKey: claudeApiKey()!, maxRetries: 1 });
  const message = await client.messages
    .stream({
      model: SEARCH_CLAUDE_MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      tools: [{
        type: 'web_search_20250305', name: 'web_search', max_uses: SEARCH_MAX_USES,
        ...(blockedDomains.length ? { blocked_domains: [...blockedDomains] } : {}),
      }],
      messages: [{ role: 'user', content: `Find recent news reports of: ${query}. Search the web and list the article URLs.` }],
    })
    .finalMessage();
  const costUsd = claudeCostUsd(SEARCH_CLAUDE_MODEL, message.usage);
  // The URLs come from the search results themselves, not the model's prose.
  const urls: string[] = [];
  const errors: string[] = [];
  for (const block of message.content) {
    if (block.type !== 'web_search_tool_result') continue;
    if (!Array.isArray(block.content)) { errors.push(block.content.error_code); continue; }
    for (const r of block.content) if (r.type === 'web_search_result' && r.url && !urls.includes(r.url)) urls.push(r.url);
  }
  // Every search failed (too_many_requests, max_uses_exceeded...): the backup may do better.
  // The call itself was billed, so the error carries its cost for searchWeb to pass on.
  if (!urls.length && errors.length) throw Object.assign(new Error(`web_search error: ${errors.join(', ')}`), { costUsd });
  console.log(`search: claude-web (${SEARCH_CLAUDE_MODEL})`);
  return { urls: urls.slice(0, maxResults), costUsd, via: 'claude-web' };
}

async function searchViaOpenRouter(query: string, maxResults: number, model: string): Promise<SearchResult> {
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
  console.log('search: openrouter-web');
  const message = completion.choices[0]?.message as { annotations?: { type: string; url_citation?: { url: string } }[] } | undefined;
  const urls = [...new Set((message?.annotations ?? []).filter((a) => a.type === 'url_citation' && a.url_citation?.url).map((a) => a.url_citation!.url))];
  return { urls, costUsd: Number((completion.usage as { cost?: number } | undefined)?.cost ?? 0), via: 'openrouter-web' };
}
