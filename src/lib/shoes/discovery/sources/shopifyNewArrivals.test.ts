import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readShopifyNewArrivals, readAllShopifyNewArrivals, cleanModelText, looksLikeRunningShoe, NEW_ARRIVALS_STORES, type NewArrivalsStore } from './shopifyNewArrivals';

const fx = (n: string) => readFileSync(join(__dirname, '__fixtures__', n), 'utf8');
const now = () => new Date('2026-09-14T12:00:00Z');
const serve = (fixture: string) => {
  const urls: string[] = [];
  return { urls, deps: { now, fetch: async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(fx(fixture), { status: 200 }); } } };
};
const kicksown = NEW_ARRIVALS_STORES.find(s => s.store === 'kicksown.com')!;
const startfitness = NEW_ARRIVALS_STORES.find(s => s.store === 'startfitness.co.uk')!;
const altra = NEW_ARRIVALS_STORES.find(s => s.store === 'www.altrarunning.com/en-us')!;

describe('cleanModelText', () => {
  it('strips colourway quotes, the pipe suffix, the dash suffix, gender words and "running shoes"', () => {
    expect(cleanModelText("361° Mega 3 Pro '24H' | Running Shoes")).toBe('361° Mega 3 Pro');
    expect(cleanModelText("Anta C202 7.0 'Green Black' | Running Shoes (Discount) Only for US")).toBe('Anta C202 7.0');
    expect(cleanModelText('LiNing Feidian 6 Ultra ’HangZhou Marathon‘')).toBe('LiNing Feidian 6 Ultra');
    expect(cleanModelText('Saucony Endorphin Elite 3 Running Shoes - White')).toBe('Saucony Endorphin Elite 3');
    expect(cleanModelText('Saucony Guide TR GORE-TEX Womens Trail Running Shoes - Black')).toBe('Saucony Guide TR GORE-TEX');
    expect(cleanModelText("Women's Torin 9 GTX")).toBe('Torin 9 GTX');
    expect(cleanModelText('005 - M - Zephyr')).toBe('005');
    expect(cleanModelText('HFS II - Men (Clearance)')).toBe('HFS II');
    expect(cleanModelText('Flame 3.5 “Reverse”')).toBe('Flame 3.5');
    expect(cleanModelText('Flame 5「Women」')).toBe('Flame 5');
  });
});

describe('looksLikeRunningShoe', () => {
  const store: NewArrivalsStore = { store: 'x' };
  it('excludes apparel, socks, boots and other sports by title or type, whatever the tags say', () => {
    expect(looksLikeRunningShoe({ title: 'Running Socks', product_type: 'Socks', tags: ['running'] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Wade All City 14', product_type: 'Basketball Shoes', tags: [] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Olympus 7 Mid GORE-TEX Womens Walking Boots', product_type: 'Footwear', tags: [] }, { ...store, assumeShoes: true })).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Junior Running Tights', product_type: 'Clothing', tags: [] }, store)).toBe(false);
  });
  it('accepts on the type, the title, a tag (underscores read as spaces), the body, or the store being all shoes', () => {
    expect(looksLikeRunningShoe({ title: 'Feidian 6 Ultra', product_type: '跑步鞋', tags: [] }, store)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Endorphin Elite 3 Running Shoes', product_type: 'Footwear', tags: [] }, store)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Vanish Carbon 3', product_type: '', tags: ['SHOP_ROAD_SHOES'] }, store)).toBe(true);
    expect(looksLikeRunningShoe({ title: '005 - M - Zephyr', product_type: 'Shoes', tags: [] }, store)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Flame 5 - Apex', product_type: 'MEN', tags: [], body_html: '<p>Cushioning for long-distance runs.</p>' }, store)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Big 3 5.0 PRO', product_type: 'MEN', tags: [], body_html: '<p>Built for the court.</p>' }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Richmond 3', product_type: '', tags: [] }, { ...store, assumeShoes: true })).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Richmond 3', product_type: '', tags: [] }, store)).toBe(false);
  });
});

describe('readShopifyNewArrivals', () => {
  it('kicksown: running shoes of the last 21 days, colourways collapsed, no brand (the vendor is the store), basketball and apparel out', async () => {
    const { urls, deps } = serve('kicksown-products.json');
    const r = await readShopifyNewArrivals(kicksown, deps);
    expect(urls).toEqual(['https://kicksown.com/products.json?limit=250&page=1']);
    expect(r.empty).toBe(false);
    expect(r.nominations.map(n => [n.brandText, n.title])).toEqual([
      [undefined, 'Anta C202 7.0'],
      [undefined, '361° Mega 3 Pro'],
      [undefined, 'LiNing Feidian 6 Ultra'],
    ]);
    expect(r.nominations[1]).toMatchObject({ source: 'shopify:kicksown.com', url: 'https://kicksown.com/products/361-mega-3pro-running-shoes-unisex-low-top-black', modelText: '361° Mega 3 Pro' });
    expect(r.nominations[1].publishedAt?.toISOString()).toBe('2026-09-08T09:12:22.000Z');
  });
  it('Start Fitness: the vendor is the brand; boots, socks and tights are out', async () => {
    const r = await readShopifyNewArrivals(startfitness, serve('startfitness-products.json').deps);
    expect(r.nominations.map(n => [n.brandText, n.title])).toEqual([['Saucony', 'Saucony Guide TR GORE-TEX']]);
  });
  it("Altra: the store's brand, Men's and Women's collapse to one, the gift card and the older shoe are out", async () => {
    const r = await readShopifyNewArrivals(altra, serve('altra-products.json').deps);
    expect(r.nominations.map(n => [n.brandText, n.title, n.url])).toEqual([['Altra', 'Torin 9 GTX', 'https://www.altrarunning.com/en-us/products/womens-torin-9-gtx-al0a85u1']]);
  });
  it('reads a second page only when the first was full', async () => {
    const urls: string[] = [];
    const page = (n: number) => ({ products: Array.from({ length: n }, (_, i) => ({ title: `Shoe ${i}`, handle: `shoe-${i}`, product_type: 'Running Shoes', tags: [], published_at: '2026-09-10T00:00:00Z' })) });
    const r = await readShopifyNewArrivals({ store: 'x.com', brand: 'X' }, { now, fetch: async input => { urls.push(String(input)); return new Response(JSON.stringify(urls.length === 1 ? page(250) : page(3)), { status: 200 }); } });
    expect(urls).toEqual(['https://x.com/products.json?limit=250&page=1', 'https://x.com/products.json?limit=250&page=2']);
    expect(r.nominations).toHaveLength(60); // capped per store
  });
  it('a 404, a refusal or a reply without products is an empty source carrying the error', async () => {
    const store = { store: 'x.com' };
    expect(await readShopifyNewArrivals(store, { now, fetch: async () => new Response('', { status: 404 }) })).toMatchObject({ source: 'shopify:x.com', empty: true, error: 'HTTP 404', nominations: [] });
    expect(await readShopifyNewArrivals(store, { now, fetch: async () => new Response('', { status: 503 }) })).toMatchObject({ empty: true, error: 'unreachable:503' });
    expect(await readShopifyNewArrivals(store, { now, fetch: async () => new Response('{"nope":1}', { status: 200 }) })).toMatchObject({ empty: true, error: 'reply had no products' });
  });
  it('reads every configured store', async () => {
    const asked: string[] = [];
    const r = await readAllShopifyNewArrivals({ now, fetch: async input => { asked.push(String(input)); return new Response('{"products":[]}', { status: 200 }); } });
    expect(asked).toHaveLength(NEW_ARRIVALS_STORES.length);
    expect(r.every(x => x.empty)).toBe(true);
  });
});
