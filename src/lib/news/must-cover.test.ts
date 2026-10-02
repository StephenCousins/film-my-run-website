import { describe, expect, it } from 'vitest';
import { gapBundle, gapsToFill, liveEdition, mentions, mustCoverFor, type MustCoverEvent } from './must-cover';
import { pickBundles, isStale } from './plan';
import type { Bundle, Verdict } from './types';

const ev = (name: string, aliases: string[], start: string, end: string): MustCoverEvent =>
  ({ name, aliases, topic: 'trail_ultra', editions: [{ start, end, status: 'confirmed' }] });
const utmb = ev('UTMB', ['UTMB', 'Ultra-Trail du Mont-Blanc'], '2027-08-23', '2027-08-29');
const spine = ev('Montane Winter Spine Race', ['Spine Race', 'Winter Spine'], '2027-01-10', '2027-01-17');
const at = (iso: string) => new Date(`${iso}T06:00:00Z`);
const v = (i: number): Verdict => ({ type: 'news', confidence: 0.95, isRunning: true, topic: 'trail_ultra', isUk: false, importance: i });
const b = (headline: string, i = 5, ageDays = 0, now = at('2027-08-30')): Bundle => ({
  key: headline, headline, verdicts: [v(i)], alreadyCovered: false,
  items: [{ articleId: 1, url: 'https://x.test', source: 'iRunFar', title: headline, pubDate: new Date(now.getTime() - ageDays * 86_400_000), summary: '', text: 't', imageUrl: null, photoCredit: null }],
});

describe('must-cover events', () => {
  it('matches acronyms by case and names in any case, as whole words', () => {
    expect(mentions(utmb, 'Dauwalter wins UTMB again')).toBe(true);
    expect(mentions(utmb, 'utmb index row')).toBe(false);
    expect(mentions(utmb, 'Ultra-trail du Mont-Blanc result')).toBe(true);
    expect(mentions(spine, 'The winter spine race leader')).toBe(true);
    expect(mentions(utmb, 'UTMBX')).toBe(false);
  });
  it('is live from three weeks before the start to a week after the finish', () => {
    expect(liveEdition(utmb, at('2027-08-01'))).toBeUndefined();
    expect(liveEdition(utmb, at('2027-08-02'))).toBeDefined();
    expect(liveEdition(utmb, at('2027-09-05'))).toBeDefined();
    expect(liveEdition(utmb, at('2027-09-06'))).toBeUndefined();
  });
  it('a story about a live event goes first, outside the cap, and is never stale', () => {
    const now = at('2027-09-04');
    const bundles = [b('A', 9, 0, now), b('B', 8, 0, now), b('Hawks wins UTMB', 3, 6, now)];
    for (const x of bundles) x.mustCover = mustCoverFor(x, now, [utmb])?.name;
    expect(isStale(bundles[2], now)).toBe(false);
    expect(pickBundles(bundles, 2, now).map((x) => x.key)).toEqual(['Hawks wins UTMB', 'A', 'B']);
  });
  it('ignores an event outside its window', () => {
    expect(mustCoverFor(b('UTMB lottery opens'), at('2027-03-01'), [utmb])).toBeUndefined();
  });
  it('fills a gap one to three days after the finish, only with nothing published since the start', () => {
    expect(gapsToFill(at('2027-08-29'), [], [utmb])).toHaveLength(0);
    expect(gapsToFill(at('2027-08-30'), [], [utmb])).toHaveLength(1);
    expect(gapsToFill(at('2027-09-01'), [], [utmb])).toHaveLength(1);
    expect(gapsToFill(at('2027-09-02'), [], [utmb])).toHaveLength(0);
    expect(gapsToFill(at('2027-08-30'), [{ title: 'Hawks wins UTMB', createdAt: at('2027-08-29') }], [utmb])).toHaveLength(0);
    // A story from last year's edition doesn't count.
    expect(gapsToFill(at('2027-08-30'), [{ title: 'UTMB lottery opens', createdAt: at('2027-01-10') }], [utmb])).toHaveLength(1);
  });
  it('a gap bundle asks for British results and searches from its headline', () => {
    const g = gapBundle(utmb, utmb.editions[0]);
    expect(g.headline).toBe('UTMB 2027 results');
    expect(g.mustCover).toBe('UTMB');
    expect(g.note).toMatch(/British/);
    expect(g.items).toEqual([]);
  });
});
