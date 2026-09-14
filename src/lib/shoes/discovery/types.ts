/** One candidate shoe put forward by a discovery source, before any resolution. */
export interface Nomination {
  brandText?: string;
  modelText: string;
  title: string;
  url: string;
  publishedAt: Date | null;
  /** Feed key, or `shopify:<store>`. */
  source: string;
}

export interface SourceResult {
  source: string;
  nominations: Nomination[];
  /** True when `nominations` is empty — nothing usable, filtered to nothing, or failed (see `error`). */
  empty: boolean;
  error?: string;
}
