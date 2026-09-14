import { describe, it, expect } from 'vitest';
import { resolveBrand, loadBrands, resetBrandCache, BRAND_CACHE_TTL_MS, type Brand } from './brands';

const brands: Brand[] = [
  { id: 1, name: 'ASICS', aliases: ['asics'], domain: 'asics.com', newArrivalsUrl: null },
  { id: 2, name: 'Topo Athletic', aliases: ['topo', 'topo athletic'], domain: 'topoathletic.com', newArrivalsUrl: null },
  { id: 3, name: 'On', aliases: ['on', 'on running'], domain: 'on.com', newArrivalsUrl: null },
  { id: 4, name: 'Li-Ning', aliases: ['li-ning', 'li ning', 'lining'], domain: 'en.lining.com', newArrivalsUrl: null },
  { id: 5, name: '361°', aliases: ['361', '361°', '361 degrees', '361 degree', '361sport'], domain: '361europe.com', newArrivalsUrl: null },
  { id: 6, name: 'Do-Win', aliases: ['do-win', 'dowin', 'do win', 'duowei'], domain: 'dowin.com.cn', newArrivalsUrl: null },
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
  it('ignores hyphens and spacing: LiNing, Li Ning and Li-Ning are one brand', () => {
    expect(resolveBrand('LiNing', brands)?.name).toBe('Li-Ning');
    expect(resolveBrand('Li Ning', brands)?.name).toBe('Li-Ning');
    expect(resolveBrand('li-ning', brands)?.name).toBe('Li-Ning');
    expect(resolveBrand('Dowin', brands)?.name).toBe('Do-Win');
    expect(resolveBrand('Do Win', brands)?.name).toBe('Do-Win');
  });
  it('ignores the degree sign: 361, 361° and 361 Degrees resolve', () => {
    expect(resolveBrand('361 Degrees', brands)?.name).toBe('361°');
    expect(resolveBrand('361°', brands)?.name).toBe('361°');
    expect(resolveBrand('361', brands)?.name).toBe('361°');
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
