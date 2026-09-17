import { describe, it, expect } from 'vitest';
import { buildOrderLines, subtotalPence, variantLabel } from './orders';
import type { ShopItem } from '@/lib/shop';

const tee = {
  slug: 'tee', name: 'Tee', printifyId: 'p1', images: [{ src: 'img', position: 'front' }],
  variants: [{ id: 1, colour: 'Black', size: 'M', price: 29.99 }, { id: 2, colour: 'Black', size: 'L', price: 31.99 }],
} as unknown as ShopItem;
const cap = { slug: 'cap', name: 'Cap', printifyId: 'p2', images: [], variants: [{ id: 9, colour: 'Navy', size: 'One size', price: 26.99 }] } as unknown as ShopItem;
const items = [tee, cap];

describe('buildOrderLines', () => {
  it('prices from the catalogue, not the client', () => {
    const lines = buildOrderLines([{ slug: 'tee', variantId: 2, quantity: 2, price: 1 } as never], items);
    expect(lines[0].unitPence).toBe(3199);
    expect(subtotalPence(lines)).toBe(6398);
  });
  it('rejects unknown variants, bad quantities and empty baskets', () => {
    expect(() => buildOrderLines([{ slug: 'tee', variantId: 99, quantity: 1 }], items)).toThrow(/Unknown/);
    expect(() => buildOrderLines([{ slug: 'nope', variantId: 1, quantity: 1 }], items)).toThrow(/Unknown/);
    expect(() => buildOrderLines([{ slug: 'tee', variantId: 1, quantity: 0 }], items)).toThrow(/quantity/);
    expect(() => buildOrderLines([{ slug: 'tee', variantId: 1, quantity: 1.5 }], items)).toThrow(/quantity/);
    expect(() => buildOrderLines([], items)).toThrow(/empty/);
  });
  it('labels one-size items without the size', () => {
    expect(variantLabel(cap.variants[0])).toBe('Navy');
    expect(variantLabel(tee.variants[0])).toBe('Black / M');
  });
});
