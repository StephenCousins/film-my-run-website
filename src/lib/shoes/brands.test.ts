import { describe, it, expect } from 'vitest';
import { resolveBrand, loadBrands, resetBrandCache, BRAND_CACHE_TTL_MS, type Brand } from './brands';

const brands: Brand[] = [
  { id: 1, name: 'ASICS', aliases: ['asics'], domain: 'asics.com', newArrivalsUrl: null },
  { id: 2, name: 'Topo Athletic', aliases: ['topo', 'topo athletic'], domain: 'topoathletic.com', newArrivalsUrl: null },
  { id: 3, name: 'On', aliases: ['on', 'on running'], domain: 'on.com', newArrivalsUrl: null },
];

describe('resolveBrand', () => {
  it('resolves canonical name case-insensitively', () => {
    expect(resolveBrand('Asics', brands)?.name).toBe('ASICS');
  });
  it('resolves an alias', () => {
    expect(resolveBrand('Topo', brands)?.name).toBe('Topo Athletic');
  });
  it('trims and collapses whitespace', () => {
    expect(resolveBrand('  on   running ', brands)?.name).toBe('On');
  });
  it('returns null for unknown', () => {
    expect(resolveBrand('Ascics', brands)).toBeNull();
  });
});

describe('loadBrands', () => {
  it('caches for five minutes, then reloads; resetBrandCache forces a reload', async () => {
    resetBrandCache();
    let loads = 0;
    let clock = 1_000_000;
    const deps = { findAll: async () => { loads++; return brands; } };
    const now = () => clock;
    expect(await loadBrands(deps, now)).toBe(brands);
    await loadBrands(deps, now);
    expect(loads).toBe(1);
    clock += BRAND_CACHE_TTL_MS - 1;
    await loadBrands(deps, now);
    expect(loads).toBe(1);
    clock += 1;
    await loadBrands(deps, now);
    expect(loads).toBe(2);
    resetBrandCache();
    await loadBrands(deps, now);
    expect(loads).toBe(3);
    resetBrandCache();
  });
});
