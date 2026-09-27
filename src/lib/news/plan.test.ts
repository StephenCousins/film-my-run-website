import { describe, expect, it } from 'vitest';
import { freshImportance, isStale, pickBundles, uniqueSlug, withinCeiling } from './plan';
import type { Bundle, Verdict } from './types';

const v = (i: number): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance: i });
const b = (key: string, i: number, alreadyCovered = false): Bundle => ({ key, headline: key, items: [], verdicts: [v(i)], alreadyCovered });

describe('choosing what to write', () => {
  it('drops already-covered events, ranks by importance, caps at 4', () => {
    const picked = pickBundles([b('a', 3), b('b', 9), b('c', 7, true), b('d', 8), b('e', 5), b('f', 6)], 4);
    expect(picked.map((x) => x.key)).toEqual(['b', 'd', 'f', 'e']);
  });
  it('stops before the month passes £10', () => {
    expect(withinCeiling(12.0, 0.12)).toBe(true);    // $12.12 < £10 x 1.27 = $12.70
    expect(withinCeiling(12.65, 0.12)).toBe(false);
  });
  it('never reuses a slug', () => {
    const taken = new Set(['evans-wins-utmb']);
    expect(uniqueSlug('Evans wins UTMB!', taken)).toBe('evans-wins-utmb-2');
    expect(uniqueSlug('Évans — wins, UTMB', new Set())).toBe('evans-wins-utmb');
  });
  it('uses fallback slug for all-non-ASCII titles', () => {
    expect(uniqueSlug('東京マラソン', new Set())).toBe('story');
  });
  it('suffixes fallback slug when taken', () => {
    const taken = new Set(['story']);
    const slug = uniqueSlug('!!!', taken);
    expect(slug).not.toBe('');
    expect(slug).not.toBe('story');
    expect(slug).toBe('story-2');
  });
  it('caps at 0 yields empty list', () => {
    const picked = pickBundles([b('a', 5), b('b', 9)], 0);
    expect(picked).toEqual([]);
  });
  it('returns all non-covered when fewer than cap', () => {
    const picked = pickBundles([b('a', 3), b('b', 9, true)], 10);
    expect(picked.map((x) => x.key)).toEqual(['a']);
  });
});

describe('stories fade while they wait (27 Sep 2026)', () => {
  const now = new Date('2026-09-27T06:00:00Z');
  const aged = (key: string, i: number, days: number): Bundle => ({
    ...b(key, i),
    items: [{ articleId: 1, url: `https://x.test/${key}`, source: 'S', title: key, pubDate: new Date(now.getTime() - days * 86_400_000), summary: '', text: 'x', imageUrl: null, photoCredit: null }],
  });
  it('a point off for every two days since the newest report', () => {
    expect(freshImportance(aged('a', 7, 0), now)).toBe(7);
    expect(freshImportance(aged('a', 7, 1.9), now)).toBe(7);
    expect(freshImportance(aged('a', 7, 4), now)).toBe(5);
  });
  it('drops anything over 4 days old unless it is a big story (8 or more)', () => {
    expect(isStale(aged('a', 7, 5), now)).toBe(true);
    expect(isStale(aged('a', 8, 9), now)).toBe(false);
    expect(isStale(aged('a', 7, 3), now)).toBe(false);
    expect(isStale({ ...aged('a', 5, 12), onDemand: true }, now)).toBe(false);
  });
  it('picks fresh over faded, and never a stale one', () => {
    const picked = pickBundles([aged('old', 7, 6), aged('faded', 8, 6), aged('fresh', 6, 0)], 2, now);
    expect(picked.map((x) => x.key)).toEqual(['fresh', 'faded']); // 6 now vs 8-3=5; 'old' is stale
  });
});
