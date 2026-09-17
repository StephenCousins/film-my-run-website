import { describe, it, expect } from 'vitest';
import { buildOrderLines, subtotalPence, variantLabel, linesFor, contradoShippingPence, returnUrls } from './orders';
import type { ShopItem } from '@/lib/shop';

const tee = {
  slug: 'tee', name: 'Tee', printifyId: 'p1', supplier: 'printify', images: [{ src: 'img', position: 'front' }],
  variants: [{ id: 1, colour: 'Black', size: 'M', price: 29.99 }, { id: 2, colour: 'Black', size: 'L', price: 31.99 }],
} as unknown as ShopItem;
const cap = { slug: 'cap', name: 'Cap', printifyId: 'p2', supplier: 'printify', images: [], variants: [{ id: 9, colour: 'Navy', size: 'One size', price: 26.99 }] } as unknown as ShopItem;
const vest = { slug: 'vest', name: 'Vest', printifyId: '', supplier: 'contrado', images: [{ src: 'white', colour: 'White' }, { src: 'black', colour: 'Black' }],
  variants: [{ id: '2Y3abc', colour: 'Black', size: 'M', price: 44.95, supplierProductId: '3097113', options: [{ optionId: 653, optionName: 'Vest Size', optionValueId: 3097, optionValueName: 'Medium' }] }] } as unknown as ShopItem;
const items = [tee, cap, vest];

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
  it('matches a numeric variant id sent as a string (the app sends strings)', () => {
    const lines = buildOrderLines([{ slug: 'tee', variantId: '2', quantity: 1 }], items);
    expect(lines[0].variantId).toBe(2);
    expect(lines[0].unitPence).toBe(3199);
  });
  it('labels one-size items without the size', () => {
    expect(variantLabel(cap.variants[0])).toBe('Navy');
    expect(variantLabel(tee.variants[0])).toBe('Black / M');
  });
});

describe('suppliers', () => {
  it('carries the supplier, product id and option ids through to the order line', () => {
    const lines = buildOrderLines([{ slug: 'vest', variantId: '2Y3abc', quantity: 1 }, { slug: 'tee', variantId: 1, quantity: 1 }], items);
    expect(linesFor(lines, 'contrado')).toHaveLength(1);
    expect(linesFor(lines, 'printify')).toHaveLength(1);
    expect(lines[0]).toMatchObject({ supplier: 'contrado', supplierProductId: '3097113', variantId: '2Y3abc', unitPence: 4495, image: 'black' });
    expect(lines[0].options?.[0].optionValueId).toBe(3097);
  });
  it('prices Contrado postage per item', () => {
    expect(contradoShippingPence(0)).toBe(0);
    expect(contradoShippingPence(1)).toBe(599);
    expect(contradoShippingPence(3)).toBe(697);
  });
});

describe('returnUrls', () => {
  it('web: thanks and basket on the site', () => {
    expect(returnUrls('https://filmmyrun.com', undefined)).toEqual({
      success_url: 'https://filmmyrun.com/shop/thanks?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://filmmyrun.com/shop/basket',
      metadata: {},
    });
  });
  it('app: the same pages flagged app=1, and the source in metadata', () => {
    expect(returnUrls('https://filmmyrun.com', 'app')).toEqual({
      success_url: 'https://filmmyrun.com/shop/thanks?session_id={CHECKOUT_SESSION_ID}&app=1',
      cancel_url: 'https://filmmyrun.com/shop/basket?app=1',
      metadata: { source: 'app' },
    });
  });
  it('anything else counts as web', () => {
    expect(returnUrls('https://x', 'evil').metadata).toEqual({});
  });
});
