import { describe, expect, it } from 'vitest';
import { shopItems } from '@/lib/shop';
import { christmasOn, GUIDE_SECTIONS, LAST_ORDER_UK, orderByLabel, teeForRunner } from './christmas';

const tees = (slugs: string[]) => new Set(slugs);

describe('Christmas in the shop', () => {
  it('every gift guide and runner-tee slug is a real product', () => {
    const real = new Set(shopItems.map((i) => i.slug));
    for (const s of GUIDE_SECTIONS.flatMap((g) => g.slugs)) expect(real.has(s), s).toBe(true);
    const runners = [
      { slug: 'a', era: 'current', disciplines: ['trail_ultra'], distances: ['174 km, 9,920 m climb'] },
      { slug: 'b', era: 'current', disciplines: ['trail_ultra'], distances: ['55 km, 3,500 m climb'] },
      { slug: 'c', era: 'current', disciplines: ['trail_ultra'], distances: ['50 km'] },
      { slug: 'd', era: 'current', disciplines: ['road'], distances: [] },
      { slug: 'e', era: 'current', disciplines: ['track'], distances: [] },
      { slug: 'f', era: 'historic', disciplines: ['road'], distances: [] },
    ];
    for (const r of runners) expect(real.has(teeForRunner(r)), teeForRunner(r)).toBe(true);
  });

  it('a 100-miler, a mountain runner and a road runner each get their own kind of tee, the same one every time', () => {
    expect(tees(['how-hard-can-it-be', '100-miles-lousy-tshirt', 'held-the-demons-back']).has(teeForRunner({ slug: 'ruth-croft', era: 'current', disciplines: ['trail_ultra'], distances: ['174 km, 9,920 m climb'] }))).toBe(true);
    expect(tees(['glorious-up-above-diabolical-down-below', 'thats-the-hard-part-done', 'everythings-longer']).has(teeForRunner({ slug: 'x', era: 'current', disciplines: ['trail_ultra'], distances: ['42 km, 2,800 m climb'] }))).toBe(true);
    expect(tees(['ask-me-again-at-halfway', 'legs-have-gone', 'rapidly-losing-my-patience', 'bonus-miles']).has(teeForRunner({ slug: 'x', era: 'current', disciplines: ['road'], distances: [] }))).toBe(true);
    const r = { slug: 'eliud-kipchoge', era: 'current', disciplines: ['road'], distances: [] };
    expect(teeForRunner(r)).toBe(teeForRunner(r));
  });

  it('the dates read as a day and show until the UK last order date ends', () => {
    expect(orderByLabel(LAST_ORDER_UK)).toBe('Thursday 10 December');
    expect(christmasOn(new Date('2026-12-10T23:30:00Z'))).toBe(true); // 23:30 UK time, still the 10th
    expect(christmasOn(new Date('2026-12-11T00:30:00Z'))).toBe(false);
  });
});
