/** One candidate shoe put forward by a discovery source, before any resolution. */
export interface Nomination {
  brandText?: string;
  modelText: string;
  title: string;
  url: string;
  publishedAt: Date | null;
  /** Feed key, `brand:<name>`, or 'search'. */
  source: string;
}

export interface SourceResult {
  source: string;
  nominations: Nomination[];
  /** True when the source produced nothing — reachable-but-empty or failed (see `error`). */
  empty: boolean;
  error?: string;
}
