import { describe, it, expect } from 'vitest';
import { resolveBrand, type Brand } from './brands';

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
