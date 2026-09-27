export const NEWS_CONFIG = {
  windowDays: 14,
  maxStoriesPerRun: 4,
  newsThreshold: 0.9,
  borderlineFrom: 0.5,
  monthlyCeilingGbp: 10,
  usdPerGbp: 1.27,
  imageWidth: 1200,
  imageHeight: 675,
  minSourceImageWidth: 800,
  nearCopyWords: 10,
  /** Rounds of edits a draft gets to pass the checks before it is not published (never held, Stephen 27 Sep). */
  fixRounds: 3,
  /** Feeds that can back up a story but never lead one. */
  referenceOnlySources: ['Marathon Investigation'] as readonly string[],
} as const;
