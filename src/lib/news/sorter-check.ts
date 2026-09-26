import type { Verdict } from './types';

/** One labelled article plus what the sorter said about it. */
export interface SorterRow {
  id: number;
  isNews: boolean;
  unsure?: boolean;
  note?: string;
  source: string;
  title: string;
  verdict: Verdict | null;
  costUsd: number;
}

/** Same pass rule as `passesSort`, but against an arbitrary threshold for the report. */
export function passesAt(v: Verdict | null, threshold: number): boolean {
  return !!v && v.type === 'news' && v.isRunning && v.confidence >= threshold;
}

export interface ConfusionResult {
  threshold: number;
  truePass: number;
  trueReject: number;
  /** Labelled not-news but the sorter would publish — the auto-publish risk. */
  falsePass: SorterRow[];
  /** Labelled real news but the sorter would drop it. */
  missed: SorterRow[];
  /** Rows with no verdict at all (fetch or model failure), counted in the total above. */
  nullVerdicts: number;
}

/** Confusion counts at one threshold, over the labelled (non-unsure) rows only. */
export function confusion(rows: SorterRow[], threshold: number): ConfusionResult {
  const known = rows.filter((r) => !r.unsure);
  const result: ConfusionResult = { threshold, truePass: 0, trueReject: 0, falsePass: [], missed: [], nullVerdicts: 0 };
  for (const r of known) {
    if (!r.verdict) result.nullVerdicts++;
    const pass = passesAt(r.verdict, threshold);
    if (r.isNews && pass) result.truePass++;
    else if (r.isNews && !pass) result.missed.push(r);
    else if (!r.isNews && pass) result.falsePass.push(r);
    else result.trueReject++;
  }
  return result;
}

export interface HistogramBucket {
  bucket: string;
  news: number;
  notNews: number;
  unsure: number;
}

/** Confidence spread in 0.1 buckets for news-typed verdicts, split by label. */
export function confidenceHistogram(rows: SorterRow[]): HistogramBucket[] {
  const buckets: HistogramBucket[] = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`,
    news: 0, notNews: 0, unsure: 0,
  }));
  for (const r of rows) {
    if (!r.verdict || r.verdict.type !== 'news') continue;
    const idx = Math.min(9, Math.max(0, Math.floor(r.verdict.confidence * 10)));
    if (r.unsure) buckets[idx].unsure++;
    else if (r.isNews) buckets[idx].news++;
    else buckets[idx].notNews++;
  }
  return buckets;
}
