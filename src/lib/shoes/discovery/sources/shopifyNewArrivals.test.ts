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
    expect(cleanModelText('Mizuno Wave Rider 28 WIDE FIT (2E) Mens Running Shoes - Black')).toBe('Mizuno Wave Rider 28');
    expect(cleanModelText('Hoka Clifton 11 WIDE FIT Womens Running Shoes - White')).toBe('Hoka Clifton 11');
  });
});

describe('looksLikeRunningShoe', () => {
  const store: NewArrivalsStore = { store: 'x' };
  it('excludes apparel, socks, boots and other sports by title or type, whatever the tags say', () => {
    expect(looksLikeRunningShoe({ title: 'Running Socks', product_type: 'Socks', tags: ['running'] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Wade All City 14', product_type: 'Basketball Shoes', tags: [] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Olympus 7 Mid GORE-TEX Womens Walking Boots', product_type: 'Footwear', tags: [] }, { ...store, assumeShoes: true })).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Junior Running Tights', product_type: 'Clothing', tags: [] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Hyperion Elite LD 2', product_type: 'Running Spikes', tags: [] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Mojito GTX', product_type: 'Lifestyle', tags: [] }, store)).toBe(false);
  });
  it('reads a tag as a category (after a "Footwear Type:" key, with a qualifier), but not a promo that mentions socks', () => {
    expect(looksLikeRunningShoe({ title: 'Olympus 7 Mid', product_type: 'Footwear', tags: ['Sport:Running', 'Footwear Type:Walking Boots'] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Wade 12', product_type: 'Footwear', tags: ['basketball shoes'] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Cheviot 3 Pack', product_type: 'Footwear', tags: ['Socks'] }, store)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Clifton 11', product_type: 'Footwear', tags: ['Flair: + FREE PAIR OF SOCKS', 'Sport:Running'] }, store)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Clifton 11', product_type: 'Footwear', tags: 'Sport:Running, Footwear Type:Max Cushion' }, store)).toBe(true);
  });
  it("a store with a typePattern puts forward only that type, whatever the title or tags say", () => {
    const karhu = NEW_ARRIVALS_STORES.find(s => s.store === 'karhu.com')!;
    const raidlight = NEW_ARRIVALS_STORES.find(s => s.store === 'raidlight.com')!;
    const scarpa = NEW_ARRIVALS_STORES.find(s => s.store === 'scarpa.com')!;
    expect(looksLikeRunningShoe({ title: "WOMEN'S FUSION 4.0 - CRYSTAL GREY / METAL", product_type: 'Running', tags: [] }, karhu)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'FULCRUM STAR - AURORA', product_type: 'Lifestyle', tags: ['running heritage'] }, karhu)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'ULTRA MAX', product_type: 'Chaussures de trail unisexes', tags: [] }, raidlight)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'R-LIGHT', product_type: 'Maillot de trail manches courtes homme', tags: [] }, raidlight)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'R-SLIDES', product_type: 'Chaussures de récupération unisexes', tags: [] }, raidlight)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Spin Planet', product_type: 'Trail Running', tags: [] }, scarpa)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Ribelle Run', product_type: 'Mountaineering', tags: [] }, scarpa)).toBe(false);
  });
  it("a sandal brand's sandals are shoes; its clogs, parts and socks are not; anyone else's sandals are not", () => {
    const luna = NEW_ARRIVALS_STORES.find(s => s.store === 'lunasandals.com')!;
    const bedrock = NEW_ARRIVALS_STORES.find(s => s.store === 'bedrocksandals.com')!;
    const shamma = NEW_ARRIVALS_STORES.find(s => s.store === 'shammasandals.com')!;
    expect(looksLikeRunningShoe({ title: 'LUNA Brujita', product_type: 'Sandal', tags: ['ACTIVITY:Trail Running'] }, luna)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Mountain Clog - Leather Suede', product_type: 'Clog', tags: [] }, bedrock)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Cairn Sandal Re-Soul', product_type: 'Sandal', tags: [] }, bedrock)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Performance Split-Toe Socks', product_type: 'Accessories', tags: [] }, bedrock)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Numa Legend', product_type: 'Sandals', tags: ['sandals'] }, shamma)).toBe(true);
    expect(looksLikeRunningShoe({ title: 'Soles Only: Numa Warrior (6mm)', product_type: 'Sandal - Part', tags: [] }, shamma)).toBe(false);
    expect(looksLikeRunningShoe({ title: 'Ora Recovery Slide', product_type: 'Sandals', tags: ['running'] }, startfitness)).toBe(false);
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
  const page = (n: number, publishedAt = '2026-09-10T00:00:00Z', offset = 0) => ({ products: Array.from({ length: n }, (_, i) => ({ title: `Shoe ${offset + i}`, handle: `shoe-${offset + i}`, product_type: 'Running Shoes', tags: [], published_at: publishedAt })) });
  /** Serves `pages` in order and records the URLs asked. */
  const paged = (...pages: object[]) => {
    const urls: string[] = [];
    return { urls, deps: { now, fetch: async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify(pages[urls.length - 1] ?? { products: [] }), { status: 200 }); } } };
  };
  it('reads a second page only when the first was full, and up to three', async () => {
    const two = paged(page(250), page(3, undefined, 250));
    const r = await readShopifyNewArrivals({ store: 'x.com', brand: 'X' }, two.deps);
    expect(two.urls).toEqual(['https://x.com/products.json?limit=250&page=1', 'https://x.com/products.json?limit=250&page=2']);
    expect(r.nominations).toHaveLength(60); // capped per store
    expect(r.stores).toEqual([{ store: 'shopify:x.com', fetched: 253, nominated: 60 }]);
    const four = paged(page(250), page(250, undefined, 250), page(250, undefined, 500), page(250, undefined, 750));
    await readShopifyNewArrivals({ store: 'x.com', brand: 'X' }, four.deps);
    expect(four.urls).toHaveLength(3);
  });
  it('stops paging once a full page has nothing inside the window: the listing is newest first', async () => {
    const stale = paged(page(250), page(250, '2026-07-01T00:00:00Z', 250), page(250, undefined, 500));
    await readShopifyNewArrivals({ store: 'x.com', brand: 'X' }, stale.deps);
    expect(stale.urls).toHaveLength(2);
  });
  it('the window is configurable', async () => {
    const products = { products: [
      { title: 'Old 1', handle: 'old-1', product_type: 'Running Shoes', tags: [], published_at: '2026-08-01T00:00:00Z' },
      { title: 'New 1', handle: 'new-1', product_type: 'Running Shoes', tags: [], published_at: '2026-09-10T00:00:00Z' },
    ] };
    const fetch = async () => new Response(JSON.stringify(products), { status: 200 });
    expect((await readShopifyNewArrivals({ store: 'x.com', brand: 'X' }, { now, fetch })).nominations.map(n => n.title)).toEqual(['New 1']);
    expect((await readShopifyNewArrivals({ store: 'x.com', brand: 'X' }, { now, fetch, windowDays: 60 })).nominations.map(n => n.title)).toEqual(['New 1', 'Old 1']);
  });
  it('a 404, a refusal or a reply without products is an empty source carrying the error, in the store entry too', async () => {
    const store = { store: 'x.com' };
    expect(await readShopifyNewArrivals(store, { now, fetch: async () => new Response('', { status: 404 }) })).toEqual({ source: 'shopify:x.com', empty: true, error: 'HTTP 404', nominations: [], stores: [{ store: 'shopify:x.com', fetched: 0, nominated: 0, error: 'HTTP 404' }] });
    expect(await readShopifyNewArrivals(store, { now, fetch: async () => new Response('', { status: 503 }) })).toMatchObject({ empty: true, error: 'unreachable:503', stores: [{ error: 'unreachable:503' }] });
    expect(await readShopifyNewArrivals(store, { now, fetch: async () => new Response('{"nope":1}', { status: 200 }) })).toMatchObject({ empty: true, error: 'reply had no products' });
  });
  it('reads every configured store', async () => {
    const asked: string[] = [];
    const r = await readAllShopifyNewArrivals({ now, fetch: async input => { asked.push(String(input)); return new Response('{"products":[]}', { status: 200 }); } });
    expect(asked).toHaveLength(NEW_ARRIVALS_STORES.length);
    expect(r.every(x => x.empty)).toBe(true);
  });
});
