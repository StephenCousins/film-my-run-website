import { describe, expect, it } from 'vitest';
import { pickBundles, uniqueSlug, withinCeiling } from './plan';
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
});
