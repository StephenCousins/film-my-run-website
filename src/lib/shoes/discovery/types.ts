/** One candidate shoe put forward by a discovery source, before any resolution. */
export interface Nomination {
  brandText?: string;
  modelText: string;
  title: string;
  url: string;
  publishedAt: Date | null;
  /** Feed key, `shopify:<store>`, or `version-bump`. */
  source: string;
}

/** What one Shopify store answered: products (or lookups) read, nominations it produced, and the error when it refused. */
export interface StoreStat {
  /** `shopify:<store>` for a new-arrivals read, `version-bump:<store>` for the predictive-search lookups. */
  store: string;
  fetched: number;
  nominated: number;
  error?: string;
}

export interface SourceResult {
  source: string;
  nominations: Nomination[];
  /** True when `nominations` is empty — nothing usable, filtered to nothing, or failed (see `error`). */
  empty: boolean;
  error?: string;
  /** Shopify sources only: one entry per store read. */
  stores?: StoreStat[];
}
