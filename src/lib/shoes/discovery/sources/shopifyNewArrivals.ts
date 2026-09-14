import { fetchSiteText, liveSiteFetchDeps, type SiteFetchDeps } from '../../sitesearch/fetch';
import type { Nomination, SourceResult } from '../types';

/**
 * A Shopify store read for new products. `brand` names the store's own
 * brand for a brand store; a retailer's products carry the brand in
 * `vendor` (Start Fitness) or only in the title (kicksown, whose vendor is
 * itself), and `vendorIsBrand` says which. `assumeShoes` is for a store
 * whose catalogue is shoes with nothing in `product_type` or the tags to
 * say so (Altra, Xero, Freet, Mount to Coast): everything not obviously
 * apparel or a boot is put forward. `typePattern` is the opposite: a store
 * whose `product_type` is the one reliable word (Karhu's "Running" against
 * "Lifestyle", Scarpa's "Trail Running" against "Hiking", Raidlight's
 * "Chaussures de trail …" against a hundred kinds of trail kit) puts
 * forward only products whose type matches. `sandals` marks a sandal
 * brand, whose sandals are its running shoes.
 */
export interface NewArrivalsStore {
  /** Host, plus a locale prefix where the store only answers under one (`www.altrarunning.com/en-us`). */
  store: string;
  brand?: string;
  vendorIsBrand?: boolean;
  assumeShoes?: boolean;
  typePattern?: RegExp;
  sandals?: boolean;
}

/**
 * Stores whose `/products.json?limit=5` answered with products (probed
 * 14 September 2026, Chrome UA). Two retailers, then the brand stores that
 * also back BRAND_SITE_ADAPTERS, then brands with a store and no adapter.
 * Not here: diadora.com (404); lemsshoes.com and normanwalsh.com answer
 * but sell boots and retro trainers. 361europe.com's types are MEN/WOMEN
 * and its running shoes share the catalogue with basketball shoes that no
 * tag distinguishes, so its products are put forward on the strength of
 * `body_html` alone.
 */
export const NEW_ARRIVALS_STORES: NewArrivalsStore[] = [
  { store: 'kicksown.com' },
  { store: 'startfitness.co.uk', vendorIsBrand: true },
  { store: '361europe.com', brand: '361°' },
  { store: 'eu.anta.com', brand: 'Anta' },
  { store: 'nordarun.com', brand: 'Norda', assumeShoes: true },
  { store: 'xeroshoes.com', brand: 'Xero Shoes', assumeShoes: true },
  { store: 'www.altrarunning.com/en-us', brand: 'Altra', assumeShoes: true },
  { store: 'atreyu.com', brand: 'Atreyu', assumeShoes: true },
  { store: 'www.newtonrunning.com', brand: 'Newton', assumeShoes: true },
  { store: 'runspeedland.com', brand: 'Speedland', assumeShoes: true },
  { store: 'mounttocoast.com', brand: 'Mount to Coast', assumeShoes: true },
  { store: 'freetbarefoot.com', brand: 'Freet', assumeShoes: true },
  { store: 'karhu.com', brand: 'Karhu', typePattern: /^running$/i },
  { store: 'scarpa.com', brand: 'Scarpa', typePattern: /^trail running$/i },
  { store: 'raidlight.com', brand: 'Raidlight', typePattern: /^chaussures de trail/i },
  { store: 'lunasandals.com', brand: 'Luna', sandals: true, typePattern: /^sandals?$/i },
  { store: 'bedrocksandals.com', brand: 'Bedrock', sandals: true, typePattern: /^sandals?$/i },
  { store: 'shammasandals.com', brand: 'Shamma', sandals: true, typePattern: /^sandals?(?: - classics)?$/i },
];

/** How far back a product's `published_at` may be and still count as a new arrival. */
export const NEW_ARRIVAL_DAYS = 21;
const PAGE_SIZE = 250;
/** Start Fitness has thousands of products; three pages reach three weeks back on a busy week. */
const MAX_PAGES = 3;
/** After colourway de-duplication, the most recent products per store that are put forward. */
const MAX_PER_STORE = 60;

export interface NewArrivalsDeps extends SiteFetchDeps {
  now: () => Date;
  /** Overrides NEW_ARRIVAL_DAYS. */
  windowDays?: number;
}

const liveDeps: NewArrivalsDeps = { ...liveSiteFetchDeps, now: () => new Date() };

/** The subset of a Shopify product that is read. */
interface ShopifyProduct { title?: unknown; handle?: unknown; vendor?: unknown; product_type?: unknown; tags?: unknown; published_at?: unknown; body_html?: unknown }

// Not a running shoe, whatever else the listing says: apparel, socks,
// boots, sandals, kit, other sports, kids, parts and services. Checked on
// the title and the type; a sandal brand's sandals are exempt.
const EXCLUDED_WORDS = 'socks?|basketball|court|tights?|tee|t-shirts?|shirts?|tops?|shorts?|jackets?|hoodies?|sweatshirts?|vests?|bras?|leggings?|pants?|trousers?|caps?|hats?|beanies?|gloves?|poles?|packs?|bags?|duffle|belts?|flasks?|bottles?|gift cards?|laces|insoles?|slippers?|slides?|boots?|chelsea|clogs?|cycling|cycle|bike|helmets?|tennis|football|golf|hiking|mountaineering|climbing|approach|ski|skis|spikes?|lifestyle|apparel|clothing|accessor(?:y|ies)|equipment|nutrition|watch|watches|soles only|re-?soul|resole|replacement|parts?|kids|junior|infant|toddler';
const SANDAL_WORDS = 'sandals?';
const NOT_A_RUNNING_SHOE = new RegExp(`\\b(${EXCLUDED_WORDS}|${SANDAL_WORDS})\\b|篮球|板鞋|袜|拖鞋|凉鞋`, 'i');
const NOT_A_RUNNING_SHOE_OR_SANDAL = new RegExp(`\\b(${EXCLUDED_WORDS})\\b|篮球|板鞋|袜|拖鞋`, 'i');
// A tag is a category when the whole of it (after a "Footwear Type:" style
// key) is an excluded word, or one with a qualifier either side: "Walking
// Boots", "Basketball Shoes", "Socks". Start Fitness tags every shoe
// "Flair: + FREE PAIR OF SOCKS", which is not a category.
const EXCLUDED_TAG = new RegExp(`^(?:[a-z]+ )?(?:${EXCLUDED_WORDS}|${SANDAL_WORDS})(?: (?:shoes?|footwear))?$`, 'i');
const EXCLUDED_TAG_OR_SANDAL = new RegExp(`^(?:[a-z]+ )?(?:${EXCLUDED_WORDS})(?: (?:shoes?|footwear))?$`, 'i');
// Says "running shoe" in the type, the tags, the title or the description.
const RUNNING = /\b(running|runners?|runs?|road|trail|marathon|racing|racer|tempo|trainers?)\b|跑步|跑鞋/i;
const SHOE_TYPE = /^(shoes?|footwear|running shoes?|trail running shoes?)$/i;

function tagsOf(p: ShopifyProduct): string[] {
  if (Array.isArray(p.tags)) return p.tags.map(String);
  return typeof p.tags === 'string' ? p.tags.split(',').map(s => s.trim()) : [];
}

/** Does this listing look like a running shoe? Exclusions first (title, type, then the tags as categories), then the store's own type word, then any positive signal, then the store's own word. */
export function looksLikeRunningShoe(p: ShopifyProduct, store: NewArrivalsStore): boolean {
  const title = String(p.title ?? '');
  const type = String(p.product_type ?? '');
  const tags = tagsOf(p);
  const excluded = store.sandals ? NOT_A_RUNNING_SHOE_OR_SANDAL : NOT_A_RUNNING_SHOE;
  const excludedTag = store.sandals ? EXCLUDED_TAG_OR_SANDAL : EXCLUDED_TAG;
  if (excluded.test(title) || excluded.test(type)) return false;
  if (tags.some(t => excludedTag.test(t.replace(/^[^:]+:\s*/, '')))) return false;
  if (store.typePattern) return store.typePattern.test(type);
  if (RUNNING.test(type) || RUNNING.test(title)) return true;
  if (tags.some(t => RUNNING.test(t.replace(/_/g, ' ')))) return true; // Altra tags are SHOP_ROAD_SHOES, GIFTS_FOR_THE_ROAD_RUNNERS
  if (SHOE_TYPE.test(type)) return true;
  if (RUNNING.test(String(p.body_html ?? '').replace(/<[^>]+>/g, ' '))) return true;
  return !!store.assumeShoes;
}

/**
 * The model as the title names it: colourway quotes ('Black', "White",
 * ’HangZhou Marathon‘, 「Women」, “Reverse”), anything after " | " or the
 * first " - " (Start Fitness and the brand stores put the colour or the
 * gender there), "Men's"/"Women's"/"Unisex", a width ("WIDE FIT (2E)",
 * "(D)"), "running shoes" and a trailing "(Clearance)" are dropped.
 */
export function cleanModelText(title: string): string {
  return title
    .replace(/['‘’"“”「」][^'‘’"“”「」]*['‘’"“”「」]/g, ' ')
    .replace(/\s*\|.*$/, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\((?:clearance|discount|sale|final sale)[^)]*\)/gi, ' ')
    .replace(/\b(?:extra wide|wide fit|wide|narrow fit|narrow)\b/gi, ' ')
    .replace(/\((?:2a|b|d|2e|4e)\)/gi, ' ')
    .replace(/\b(?:men'?s|women'?s|mens|womens|unisex|men|women|ladies|male|female|m's|w's)\b/gi, ' ')
    .replace(/\b(?:trail |road )?running shoes?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:,]+|[\s\-–—:,]+$/g, '')
    .trim();
}

function parseDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * New running shoes on one Shopify store: `/products.json?limit=250`, up
 * to MAX_PAGES pages while each page is full and still reaches into the
 * window (the listing is newest first, so a page with nothing recent on it
 * means the rest is older), then the products published in the window
 * that look like running shoes, one per cleaned model name (colourways
 * collapse), most recent first. The brand is the store's own for a brand
 * store, the vendor where that is the brand, and otherwise left for the
 * normaliser to read from the title. `stores` carries one entry: how many
 * products were read, how many put forward, and the error if the store
 * refused — so the digest can tell a quiet store from a blocked one.
 */
export async function readShopifyNewArrivals(store: NewArrivalsStore, deps: NewArrivalsDeps = liveDeps): Promise<SourceResult> {
  const source = `shopify:${store.store}`;
  const cutoff = deps.now().getTime() - (deps.windowDays ?? NEW_ARRIVAL_DAYS) * 24 * 60 * 60 * 1000;
  const failed = (error: string): SourceResult => ({ source, nominations: [], empty: true, error, stores: [{ store: source, fetched: 0, nominated: 0, error }] });
  const products: ShopifyProduct[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const text = await fetchSiteText(`https://${store.store}/products.json?limit=${PAGE_SIZE}&page=${page}`, deps, 'application/json');
      if (text === null) {
        if (page === 1) return failed('HTTP 404');
        break;
      }
      const batch = (JSON.parse(text) as { products?: ShopifyProduct[] }).products;
      if (!Array.isArray(batch)) return failed('reply had no products');
      products.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      if (!batch.some(p => (parseDate(p.published_at)?.getTime() ?? 0) >= cutoff)) break;
    }
  } catch (err) {
    return failed(err instanceof Error ? err.message : String(err));
  }

  const seen = new Set<string>();
  const nominations: Nomination[] = [];
  const recent = products
    .map(p => ({ p, publishedAt: parseDate(p.published_at) }))
    .filter((x): x is { p: ShopifyProduct; publishedAt: Date } => x.publishedAt !== null && x.publishedAt.getTime() >= cutoff)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  for (const { p, publishedAt } of recent) {
    if (typeof p.title !== 'string' || typeof p.handle !== 'string' || !p.handle) continue;
    if (!looksLikeRunningShoe(p, store)) continue;
    const modelText = cleanModelText(p.title);
    if (!modelText) continue;
    const key = modelText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const vendor = typeof p.vendor === 'string' ? p.vendor.trim() : '';
    const brandText = store.brand ?? (store.vendorIsBrand && vendor ? vendor : undefined);
    nominations.push({ brandText, modelText, title: modelText, url: `https://${store.store}/products/${p.handle}`, publishedAt, source });
    if (nominations.length >= MAX_PER_STORE) break;
  }
  return { source, nominations, empty: nominations.length === 0, stores: [{ store: source, fetched: products.length, nominated: nominations.length }] };
}

export async function readAllShopifyNewArrivals(deps: NewArrivalsDeps = liveDeps, stores = NEW_ARRIVALS_STORES): Promise<SourceResult[]> {
  return Promise.all(stores.map(s => readShopifyNewArrivals(s, deps)));
}
