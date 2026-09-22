import { describe, it, expect } from 'vitest';
import { shopItems, completeTheLook } from '@/lib/shop';

describe('completeTheLook', () => {
  const tee = shopItems.find((i) => i.category === 'tees')!;

  it('offers other categories, never its own, and never itself', () => {
    const picks = completeTheLook(tee, shopItems);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((p) => p.category !== tee.category)).toBe(true);
    expect(picks.every((p) => p.key !== tee.key)).toBe(true);
    expect(new Set(picks.map((p) => p.category)).size).toBe(picks.length); // one per category
  });

  it('is the same every time for a given product', () => {
    expect(completeTheLook(tee, shopItems).map((p) => p.key)).toEqual(completeTheLook(tee, shopItems).map((p) => p.key));
  });

  it('copes with a catalogue of one', () => {
    expect(completeTheLook(tee, [tee])).toEqual([]);
  });
});
