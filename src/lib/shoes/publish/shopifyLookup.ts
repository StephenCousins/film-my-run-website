import { pageNamesExactModel } from '../pageMatch';
import { fetchSiteText, liveSiteFetchDeps, type SiteFetchDeps } from '../sitesearch/fetch';

export type ShopifyLookupDeps = SiteFetchDeps;

const LIMIT = 10;

/** A product page a store's own search named for this exact model, before the page itself is fetched. */
export interface ShopifyProductRef { url: string; title: string }

/** The subset of Shopify's predictive-search reply that is read. */
interface SuggestReply { resources?: { results?: { products?: { title?: unknown; handle?: unknown }[] } } }

/**
 * Brave barely indexes the small importers (`site:kicksown.com "Feidian
 * Ultra"` finds nothing although the page exists), but a Shopify store
 * answers its own predictive search: `/search/suggest.json?q=<model>`
 * returns products with a `handle` and `title`. The match is fuzzy — a query
 * for one model returns its neighbours and colourways — so only products
 * that pass pageNamesExactModel on the handle's URL and the title come back,
 * and the caller still fetches each page and checks its <title> as it does
 * for a search result. No search API call is spent. `store` is the host,
 * plus a locale prefix for a store that only answers under one
 * (`www.altrarunning.com/en-us`). A 404 (not a Shopify store, or the
 * endpoint is off) is "nothing found"; a refusal throws `unreachable:
 * <status>` like every other site fetch, so the caller can fall back.
 */
export async function findShopifyProductPages(store: string, brand: string, model: string, deps: ShopifyLookupDeps = liveSiteFetchDeps): Promise<ShopifyProductRef[]> {
  const url = `https://${store}/search/suggest.json?q=${encodeURIComponent(model)}&resources%5Btype%5D=product&resources%5Blimit%5D=${LIMIT}`;
  const text = await fetchSiteText(url, deps, 'application/json');
  if (text === null) {
    console.error(`Shopify lookup on ${store} for ${brand} ${model}: 404`);
    return [];
  }
  let reply: SuggestReply;
  try {
    reply = JSON.parse(text) as SuggestReply;
  } catch {
    console.error(`Shopify lookup on ${store} for ${brand} ${model}: reply was not JSON`);
    return [];
  }
  const products = reply.resources?.results?.products;
  if (!Array.isArray(products)) {
    console.error(`Shopify lookup on ${store} for ${brand} ${model}: reply had no resources.results.products`);
    return [];
  }
  const out: ShopifyProductRef[] = [];
  for (const p of products) {
    if (typeof p.handle !== 'string' || !p.handle) continue;
    const title = typeof p.title === 'string' ? p.title : '';
    const pageUrl = `https://${store}/products/${p.handle}`;
    if (!pageNamesExactModel(model, pageUrl, title)) continue;
    out.push({ url: pageUrl, title });
  }
  return out;
}
