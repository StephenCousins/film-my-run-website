import type { Brand } from '../brands';
import { webSearch, sleep } from '../search';
import { fetchPage, extractJsonLdProducts, type JsonLdProduct } from '../html';
import { pageNamesExactModel } from '../pageMatch';
import { findPages, isUnreachable, type SiteAdapter, type SitePage } from '../sitesearch';
import { BRAND_SITE_ADAPTERS } from '../sitesearch/config';

// Kept here for existing importers; the matcher lives in pageMatch.ts so the site adapters can use it without a cycle.
export { pageNamesExactModel };

export interface BrandPage {
  url: string;
  title: string;
  html: string;
  product: JsonLdProduct | null;
  releaseDate: Date | null;
  /** Whose page proved the shoe: the brand's own site, or a retailer standing in for a brand site that refuses the fetch. */
  source: 'brand' | 'retailer';
}

/**
 * What the brand-site search found. `absent` means the site answered and no
 * page names this exact model; `unreachable` means every page it tried was
 * refused (403/406/429/5xx/timeout), which says nothing about the shoe — the
 * gate then asks a retailer instead of holding `no_brand_page`.
 */
export type BrandPageResult =
  | { kind: 'found'; page: BrandPage }
  | { kind: 'absent' }
  | { kind: 'unreachable'; reason: string };

export interface BrandPageDeps {
  webSearch: typeof webSearch;
  /** The brand's own storefront lookup (sitesearch/), for brands in BRAND_SITE_ADAPTERS. */
  findSitePages: (adapter: SiteAdapter, brand: string, model: string) => Promise<SitePage[]>;
  fetchPage: (url: string) => Promise<{ html: string; title: string } | null>;
  /** Rate-limit pause after the search; tests pass a no-op. */
  sleep?: typeof sleep;
}

const liveDeps: BrandPageDeps = { webSearch, findSitePages: (adapter, brand, model) => findPages(adapter, brand, model), fetchPage: url => fetchPage(url), sleep };

const MAX_RESULTS = 5;

function parseReleaseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A fetched page that has passed pageNamesExactModel, in the shape the gate and image finder share. */
export function toBrandPage(page: { url: string; title: string; html: string }, source: BrandPage['source']): BrandPage {
  const product = extractJsonLdProducts(page.html)[0] ?? null;
  return { url: page.url, title: page.title, html: page.html, product, releaseDate: parseReleaseDate(product?.releaseDate), source };
}

/** Fetch each candidate page in turn; the first whose fetched <title> names the exact model is the answer. */
async function firstExactPage(candidates: { url: string }[], model: string, deps: BrandPageDeps): Promise<{ page: BrandPage | null; fetched: number; refused: string | null }> {
  let fetched = 0;
  let refused: string | null = null;
  for (const candidate of candidates) {
    let page: { html: string; title: string } | null;
    try {
      page = await deps.fetchPage(candidate.url);
    } catch (err) {
      refused ??= err instanceof Error ? err.message : String(err);
      continue;
    }
    if (!page) continue;
    fetched++;
    if (!pageNamesExactModel(model, candidate.url, page.title)) continue;
    return { page: toBrandPage({ url: candidate.url, title: page.title, html: page.html }, 'brand'), fetched, refused };
  }
  return { page: null, fetched, refused };
}

/**
 * The brand's own product page for this exact model. A brand whose
 * storefront has a lookup of its own (BRAND_SITE_ADAPTERS: Shopify's
 * predictive search, or a search page that lists products server-side) is
 * asked that way first and costs no search call; the Brave `site:` search
 * runs only when there is no adapter, or the adapter refused, or it named
 * nothing that proved to be the shoe. Either way the search-result title is
 * not trusted: the fetched page's <title> decides, because that is what
 * proves the page is about this version and not a neighbouring one. A fetch
 * the site refuses is remembered; if nothing was fetched at all and at least
 * one was refused, the result is `unreachable` rather than `absent`.
 */
export async function findBrandProductPage(brand: Brand, model: string, deps: BrandPageDeps = liveDeps): Promise<BrandPageResult> {
  let refusedLookup: string | null = null;
  const adapter = BRAND_SITE_ADAPTERS[brand.name];
  if (adapter) {
    try {
      const own = await firstExactPage(await deps.findSitePages(adapter, brand.name, model), model, deps);
      if (own.page) return { kind: 'found', page: own.page };
      refusedLookup = own.refused;
    } catch (err) {
      if (!isUnreachable(err)) throw err;
      refusedLookup = err.message;
      console.error(`Brand lookup for ${brand.name} ${model} refused (${err.message}); falling back to search`);
    }
  }

  const results = (await deps.webSearch(`site:${brand.domain} "${model}"`, MAX_RESULTS)).slice(0, MAX_RESULTS);
  await (deps.sleep ?? sleep)(1100);
  const { page, fetched, refused } = await firstExactPage(results, model, deps);
  if (page) return { kind: 'found', page };
  const reason = refused ?? refusedLookup;
  if (fetched === 0 && reason !== null) return { kind: 'unreachable', reason };
  return { kind: 'absent' };
}
