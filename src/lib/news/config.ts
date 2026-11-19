export const NEWS_CONFIG = {
  windowDays: 14,
  maxStoriesPerRun: 4,
  newsThreshold: 0.9,
  borderlineFrom: 0.5,
  /**
   * Raised from £10 on 19 Nov 2026 (Stephen). OpenRouter (paid) spend only, news_runs.cost_usd:
   * the Claude API key has its own budget below, and Claude Code on the subscription costs $0.
   */
  monthlyCeilingGbp: 15,
  /**
   * The Claude API key's own monthly budget, news_runs.claude_cost_usd (19 Nov 2026, Stephen: "I get
   * a $100 free monthly spend on my Claude API key as part of my Claude Subscription. We can use all
   * of that before the fallback to OpenRouter."). Reached, the key is skipped for the rest of the run.
   * The website shares the credit unseen; llm.ts also falls through when Anthropic says it's used up.
   */
  claudeCreditMonthlyUsd: 100,
  usdPerGbp: 1.27,
  imageWidth: 1200,
  imageHeight: 675,
  minSourceImageWidth: 800,
  nearCopyWords: 10,
  /** Rounds of edits a draft gets to pass the checks before it is not published (never held, Stephen 27 Sep). */
  fixRounds: 3,
  /** A story loses a point of importance for every this many days since its newest report. */
  fadeEveryDays: 2,
  /** Waiting longer than this, a story is dropped unless it scores bigStory or more. */
  staleAfterDays: 4,
  bigStory: 8,
  /** Below this (after fading) a story is not worth a slot: quiet days were filling up with other countries' domestic news (Stephen, 10 Nov 2026). */
  minImportance: 3,
  /** Feeds that can back up a story but never lead one. */
  referenceOnlySources: ['Marathon Investigation'] as readonly string[],
} as const;

/**
 * Not news reports, whatever a search says. Bare domains, subdomains included: the Claude
 * web search takes them as `blocked_domains`, and moreCoverage filters on them as well.
 */
export const NOT_NEWS_DOMAINS: readonly string[] = [
  'youtube.com', 'youtu.be', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'tiktok.com',
  'strava.com', 'reddit.com', 'wikipedia.org', 'linkedin.com',
];
