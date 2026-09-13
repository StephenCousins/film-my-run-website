import type { Brand } from '../brands';
import { webSearch, sleep } from '../search';
import { fetchPage } from '../html';
import { pageNamesExactModel, toBrandPage, type BrandPage } from './brandPage';

export interface RetailerPageDeps {
  webSearch: typeof webSearch;
  fetchPage: (url: string) => Promise<{ html: string; title: string } | null>;
  /** Rate-limit pause between retailer searches. Injected deps without one do not pause. */
  sleep?: typeof sleep;
}

export const liveRetailerDeps: RetailerPageDeps = { webSearch, fetchPage: url => fetchPage(url), sleep };

export const RETAILER_DOMAINS = [
  'sportsshoes.com', 'runnersneed.com', 'wiggle.com', 'startfitness.co.uk',
  'sportpursuit.com', 'runrepeat.com', 'running-shoe-guru.com', 'roadrunnersports.com',
];

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
 * Walk RETAILER_DOMAINS in order. Each domain's search results are fetched
 * and kept only when the fetched <title> (not the search-result title) names
 * the exact model; `accept` is handed that domain's pages and the first
 * non-null answer wins, so a caller decides what "found" means — a page for
 * the gate, images for the image finder — without repeating the search. A
 * retailer that blocks the fetch is skipped: there are seven more.
 */
export async function searchRetailerPages<T>(
  brand: Brand,
  model: string,
  accept: (pages: RetailerPage[]) => T | null,
  deps: RetailerPageDeps = liveRetailerDeps,
): Promise<T | null> {
  const pause = deps.sleep ?? (async () => {});
  for (let i = 0; i < RETAILER_DOMAINS.length; i++) {
    const domain = RETAILER_DOMAINS[i];
    if (i > 0) await pause(1100);
    const results = (await deps.webSearch(`site:${domain} "${brand.name} ${model}"`, RESULTS_PER_DOMAIN)).slice(0, RESULTS_PER_DOMAIN);

    const pages: RetailerPage[] = [];
    for (const result of results) {
      if (!onDomain(result.url, domain)) continue;
      const kind = isProductPageUrl(result.url);
      if (!kind.isProduct && kind.isArticle) continue;
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
