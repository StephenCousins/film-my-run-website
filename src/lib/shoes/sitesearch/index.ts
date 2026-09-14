import { shoeToSlug } from '../slug';
import { pageNamesExactModel } from '../pageMatch';
import { findShopifyProductPages } from '../publish/shopifyLookup';
import { fetchSiteText, liveSiteFetchDeps, type SiteFetchDeps } from './fetch';
import { parseAnchors } from './htmlSearch';

export { isUnreachable } from './fetch';
export type { SiteFetchDeps as SiteSearchDeps } from './fetch';

/** A page a site's own lookup named for this exact model, before the page itself is fetched. */
export interface SitePage { url: string; title: string }

/**
 * How a site is asked for a page about one shoe, without a search engine.
 * - `rtings-url`: RTINGS reviews live at a predictable URL built from the
 *   brand and model slugs; one GET says whether the review exists.
 * - `html-search`: the site's own search page (`?s=` on WordPress, `/search?q=`
 *   on Runner's World and the Salesforce/Nike storefronts); every anchor
 *   whose URL matches `linkPattern` is a candidate. `query: 'model'` sends
 *   the model alone — a brand's storefront does not need its own name.
 * - `shopify`: the store's predictive search (`/search/suggest.json`), for
 *   brand and retailer stores on Shopify; `store` is the host, with a locale
 *   prefix where the store redirects to one (`www.altrarunning.com/en-us`).
 */
export type SiteAdapter =
  | { kind: 'rtings-url' }
  | { kind: 'html-search'; searchUrl: string; linkPattern: RegExp; query?: 'brand-model' | 'model' }
  | { kind: 'shopify'; store: string };

export const RTINGS_REVIEWS_BASE = 'https://www.rtings.com/running-shoes/reviews';

function titleOf(html: string): string {
  const m = html.match(/<title[^>]*>([^]*?)<\/title>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

/** RTINGS slugs the brand and model the way shoeToSlug does: "Li-Ning" → li-ning, "361°" → 361, "Clifton 10" → clifton-10. */
export function rtingsReviewUrl(brand: string, model: string): string {
  return `${RTINGS_REVIEWS_BASE}/${shoeToSlug('', brand).replace(/^-/, '')}/${shoeToSlug('', model).replace(/^-/, '')}`;
}

/**
 * Pages on one site that name exactly this model and version, by the site's
 * own lookup. Every result has passed pageNamesExactModel on its URL and
 * title, so a neighbouring version or a variant ("Clifton 10 GTX") is
 * already out; the caller still fetches the page and checks its <title>.
 * Returns `[]` when the site answered and had nothing; throws `unreachable:
 * <status>` (fetch.ts) when it refused, so a caller can fall back to a web
 * search for a refusal and not for an absence.
 */
export async function findPages(adapter: SiteAdapter, brand: string, model: string, deps: SiteFetchDeps = liveSiteFetchDeps): Promise<SitePage[]> {
  switch (adapter.kind) {
    case 'rtings-url': {
      const url = rtingsReviewUrl(brand, model);
      const html = await fetchSiteText(url, deps);
      if (html === null) return [];
      const title = titleOf(html);
      return pageNamesExactModel(model, url, title) ? [{ url, title }] : [];
    }
    case 'html-search': {
      const q = adapter.query === 'model' ? model : `${brand} ${model}`;
      const url = adapter.searchUrl.replace('{q}', encodeURIComponent(q));
      const html = await fetchSiteText(url, deps);
      if (html === null) return [];
      return parseAnchors(html, url).filter(a => adapter.linkPattern.test(a.url) && pageNamesExactModel(model, a.url, a.title));
    }
    case 'shopify':
      return findShopifyProductPages(adapter.store, brand, model, deps);
  }
}
