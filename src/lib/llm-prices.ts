/**
 * Claude API prices, so calls on the API key count against the key's own
 * monthly credit (NEWS_CONFIG.claudeCreditMonthlyUsd, news_runs.claude_cost_usd).
 * They are not part of the £15 news ceiling, which is OpenRouter only. The API
 * doesn't return a cost, so it is worked out from `message.usage`.
 *
 * US dollars per million tokens, from Anthropic's price list on 19 Nov 2026.
 * Cache writes and reads are counted at the plain input price: a slight
 * overestimate, which is the safe side for a budget.
 */
export const CLAUDE_PRICES: Record<string, { inPerMTok: number; outPerMTok: number }> = {
  'claude-haiku-5-5': { inPerMTok: 0.1, outPerMTok: 0.5 },
  'claude-sonnet-5-5': { inPerMTok: 2, outPerMTok: 10 },
  'claude-opus-5-5': { inPerMTok: 4, outPerMTok: 20 },
};
/** A model missing from the table is priced as Opus, the dearest: better to stop early than overspend. */
const UNKNOWN = CLAUDE_PRICES['claude-opus-5-5'];
/** The server-side web search tool: $10 per 1,000 searches, on top of tokens. */
export const WEB_SEARCH_USD = 10 / 1000;

/** The parts of the SDK's `Usage` this needs (nullable fields as the SDK types them). */
export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export function claudeCostUsd(model: string, u: ClaudeUsage | null | undefined): number {
  if (!u) return 0; // the API always sends usage; only a test stub leaves it out
  const p = CLAUDE_PRICES[model] ?? UNKNOWN;
  const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  return (input * p.inPerMTok + u.output_tokens * p.outPerMTok) / 1_000_000 + searches * WEB_SEARCH_USD;
}
