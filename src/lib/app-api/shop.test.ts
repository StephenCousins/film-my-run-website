import { describe, it, expect } from 'vitest';
import { appShopCatalogue, FEATURED } from './shop';

describe('appShopCatalogue', () => {
  it('returns the catalogue with the featured slugs that exist, vests first', () => {
    const c = appShopCatalogue();
    expect(c.items.length).toBeGreaterThan(0);
    expect(c.categories.length).toBeGreaterThan(0);
    expect(c.featured.length).toBeGreaterThan(0);
    for (const slug of c.featured) expect(c.items.some((i) => i.slug === slug)).toBe(true);
    expect(c.items.find((i) => i.slug === c.featured[0])?.category).toBe('vests');
    expect(FEATURED[0]).toBe(c.featured[0]);
  });
});
