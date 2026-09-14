import type { Brand } from '../brands';
import { webSearch, sleep } from '../search';
import { fetchPage } from '../html';
import { pageNamesExactModel, toBrandPage, type BrandPage } from './brandPage';
import { findShopifyProductPages } from './shopifyLookup';

export interface RetailerPageDeps {
  webSearch: typeof webSearch;
  /** For `lookup: 'shopify'` retailers: the store's own product search instead of a Brave query. */
  findShopifyProductPages: typeof findShopifyProductPages;
  fetchPage: (url: string) => Promise<{ html: string; title: string } | null>;
  /** Rate-limit pause between retailer searches. Injected deps without one do not pause. */
  sleep?: typeof sleep;
}

export const liveRetailerDeps: RetailerPageDeps = {
  webSearch,
  findShopifyProductPages: (domain, brand, model) => findShopifyProductPages(domain, brand, model),
  fetchPage: url => fetchPage(url),
  sleep,
};

export const RETAILER_DOMAINS = [
  'sportsshoes.com', 'runnersneed.com', 'wiggle.com', 'startfitness.co.uk',
  'sportpursuit.com', 'runrepeat.com', 'running-shoe-guru.com', 'roadrunnersports.com',
];

/**
 * How a retailer's product pages are found: a `site:` web search, or — for
 * a Shopify store Brave barely indexes — the store's own predictive search
 * (shopifyLookup.ts), which costs no search call.
 */
export type RetailerLookup = 'search' | 'shopify';
export interface Retailer { domain: string; lookup: RetailerLookup }

/**
 * Western importers that carry the Chinese brands with proper product pages
 * (JSON-LD Product, an exact model in the title). None of the UK retailers
 * above stock these, and the brands' own English sites are thin or refuse
 * server fetches, so for these brands the importers are searched first and
 * are in practice the only source of a product page and an image. Keyed by
 * the canonical `shoe_brands.name`. kicksown, qiaodan.asia and dynafish.us
 * answered `/search/suggest.json` with products (probed 14 September 2026);
 * supwell, shopnings and chinasportshop 404 it and stay on web search.
 */
const CHINESE_IMPORTERS: Retailer[] = [
  { domain: 'kicksown.com', lookup: 'shopify' },
  { domain: 'supwell.com', lookup: 'search' },
  { domain: 'shopnings.com', lookup: 'search' },
  { domain: 'chinasportshop.com', lookup: 'search' },
];
export const RETAILERS_BY_BRAND: Record<string, Retailer[]> = {
  'Li-Ning': CHINESE_IMPORTERS,
  Anta: CHINESE_IMPORTERS,
  Xtep: CHINESE_IMPORTERS,
  '361°': CHINESE_IMPORTERS,
  Qiaodan: [{ domain: 'qiaodan.asia', lookup: 'shopify' }, ...CHINESE_IMPORTERS],
  Bmai: CHINESE_IMPORTERS,
  Dynafish: [{ domain: 'dynafish.us', lookup: 'shopify' }, ...CHINESE_IMPORTERS],
  'Do-Win': CHINESE_IMPORTERS,
  Runsifly: CHINESE_IMPORTERS,
  Peak: CHINESE_IMPORTERS,
  Kailas: CHINESE_IMPORTERS,
};

/** The brand's own importers first, then the UK list (all web search). */
export function retailersFor(brand: Brand): Retailer[] {
  return [...(RETAILERS_BY_BRAND[brand.name] ?? []), ...RETAILER_DOMAINS.map(domain => ({ domain, lookup: 'search' as const }))];
}

const RESULTS_PER_DOMAIN = 5;

export function isProductPageUrl(url: string): { isProduct: boolean; isArticle: boolean } {
  const urlLower = url.toLowerCase();
  const productPatterns = [/\/product[s]?\//i, /\/shop\//i, /\/p\//i, /\/pd\//i, /\/buy\//i, /\/item\//i];
  const articlePatterns = [/\/a\//i, /\/news\//i, /\/article[s]?\//i, /\/blog\//i, /\/release-info/i, /\/stories\//i];
  return {
    isProduct: productPatterns.some(p => p.test(urlLower)),
    isArticle: articlePatterns.some(p => p.test(urlLower)),
  };
}

/** Brave's site: operator occasionally leaks other hosts; a candidate must come from the domain that was asked for. */
function onDomain(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

/** A fetched retailer page that provably names this exact model and version. */
export interface RetailerPage { url: string; title: string; html: string; domain: string }

/**
 * Importers spell the brand their own way ("LiNing", "Li Ning", "361",
 * "Dowin"), so quoting the brand with the model would miss their pages; the
 * model alone is quoted and the brand is left as a loose term. The match
 * that follows is on the model only either way (pageNamesExactModel).
 */
function retailerQuery(domain: string, brand: Brand, model: string): string {
  return RETAILERS_BY_BRAND[brand.name]?.some(r => r.domain === domain)
    ? `site:${domain} ${brand.name} "${model}"`
    : `site:${domain} "${brand.name} ${model}"`;
}

/** Which pages on one retailer might be this shoe, by whichever lookup the retailer supports; each is still fetched and its <title> checked. */
async function candidatePages(retailer: Retailer, brand: Brand, model: string, deps: RetailerPageDeps): Promise<{ url: string }[]> {
  if (retailer.lookup === 'shopify') return deps.findShopifyProductPages(retailer.domain, brand, model);
  const results = (await deps.webSearch(retailerQuery(retailer.domain, brand, model), RESULTS_PER_DOMAIN)).slice(0, RESULTS_PER_DOMAIN);
  return results.filter(r => {
    if (!onDomain(r.url, retailer.domain)) return false;
    const kind = isProductPageUrl(r.url);
    return kind.isProduct || !kind.isArticle;
  });
}

/**
 * Walk the brand's retailers in order (retailersFor: its own importers, if
 * any, then RETAILER_DOMAINS). Each retailer's candidate pages — web-search
 * results, or the store's own search for a Shopify importer — are fetched
 * and kept only when the fetched <title> (not the search-result title) names
 * the exact model; `accept` is handed that domain's pages and the first
 * non-null answer wins, so a caller decides what "found" means — a page for
 * the gate, images for the image finder — without repeating the search. A
 * retailer that blocks the fetch is skipped: there are seven more. The
 * rate-limit pause is only between web searches; a Shopify lookup is a
 * plain page fetch.
 */
export async function searchRetailerPages<T>(
  brand: Brand,
  model: string,
  accept: (pages: RetailerPage[]) => T | null,
  deps: RetailerPageDeps = liveRetailerDeps,
): Promise<T | null> {
  const pause = deps.sleep ?? (async () => {});
  let searched = 0;
  for (const retailer of retailersFor(brand)) {
    const { domain } = retailer;
    if (retailer.lookup === 'search' && searched++ > 0) await pause(1100);
    const results = await candidatePages(retailer, brand, model, deps);

    const pages: RetailerPage[] = [];
    for (const result of results) {
      let page: { html: string; title: string } | null;
      try {
        page = await deps.fetchPage(result.url);
      } catch {
        continue;
      }
      if (!page) continue;
      if (!pageNamesExactModel(model, result.url, page.title)) continue;
      pages.push({ url: result.url, title: page.title, html: page.html, domain });
    }
    const accepted = accept(pages);
    if (accepted !== null) return accepted;
  }
  return null;
}

/**
 * The gate's fallback when the brand's own site refuses the fetch: the first
 * retailer product page that names the exact model, in BrandPage shape with
 * `source: 'retailer'` so the evidence says where the proof came from.
 */
export async function findRetailerProductPage(brand: Brand, model: string, deps: RetailerPageDeps = liveRetailerDeps): Promise<BrandPage | null> {
  return searchRetailerPages(brand, model, pages => (pages[0] ? toBrandPage(pages[0], 'retailer') : null), deps);
}
