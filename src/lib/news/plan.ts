import { NEWS_CONFIG } from './config';
import { bundleImportance } from './group';
import type { Bundle } from './types';

/** A generous per-story estimate (writer + checker), used only to stop before the ceiling. */
export const STORY_ESTIMATE_USD = 0.12;

/** Days since the newest report in a bundle (0 with none). */
export function bundleAgeDays(b: Bundle, now: Date): number {
  if (!b.items.length) return 0;
  const newest = Math.max(...b.items.map((i) => i.pubDate.getTime()));
  return Math.max(0, (now.getTime() - newest) / 86_400_000);
}

/**
 * Importance as it stands today: a point off for every two days a story has
 * waited, so a week-old result doesn't reach the page (Stephen, 27 Sep 2026).
 */
export function freshImportance(b: Bundle, now: Date): number {
  return bundleImportance(b) - Math.floor(bundleAgeDays(b, now) / NEWS_CONFIG.fadeEveryDays);
}

/** Waited too long: over staleAfterDays, unless it is a big story or Stephen asked for it. */
export function isStale(b: Bundle, now: Date): boolean {
  return !b.onDemand && bundleAgeDays(b, now) > NEWS_CONFIG.staleAfterDays && bundleImportance(b) < NEWS_CONFIG.bigStory;
}

export function pickBundles(bundles: Bundle[], cap: number, now: Date = new Date()): Bundle[] {
  return bundles
    .filter((b) => !b.alreadyCovered && !isStale(b, now))
    .sort((a, b) => freshImportance(b, now) - freshImportance(a, now))
    .slice(0, cap);
}

export function withinCeiling(monthSpentUsd: number, nextEstimateUsd: number): boolean {
  return monthSpentUsd + nextEstimateUsd <= NEWS_CONFIG.monthlyCeilingGbp * NEWS_CONFIG.usdPerGbp;
}

/** The slug's base, before any `-2` suffix uniqueSlug adds for a collision. */
export function slugBase(title: string): string {
  let base = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/, '');
  if (base === '') base = 'story';
  return base;
}

export function uniqueSlug(title: string, taken: Set<string>): string {
  const base = slugBase(title);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
