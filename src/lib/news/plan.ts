import { NEWS_CONFIG } from './config';
import { bundleImportance } from './group';
import type { Bundle } from './types';

/** A generous per-story estimate (writer + checker), used only to stop before the ceiling. */
export const STORY_ESTIMATE_USD = 0.12;

export function pickBundles(bundles: Bundle[], cap: number): Bundle[] {
  return bundles.filter((b) => !b.alreadyCovered).sort((a, b) => bundleImportance(b) - bundleImportance(a)).slice(0, cap);
}

export function withinCeiling(monthSpentUsd: number, nextEstimateUsd: number): boolean {
  return monthSpentUsd + nextEstimateUsd <= NEWS_CONFIG.monthlyCeilingGbp * NEWS_CONFIG.usdPerGbp;
}

export function uniqueSlug(title: string, taken: Set<string>): string {
  const base = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/, '');
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
