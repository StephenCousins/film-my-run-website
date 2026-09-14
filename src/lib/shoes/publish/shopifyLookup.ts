import type { Brand } from '../brands';
import { pageNamesExactModel } from './brandPage';

export interface ShopifyLookupDeps { fetch: typeof fetch }

const liveDeps: ShopifyLookupDeps = { fetch: (...args) => fetch(...args) };

const LIMIT = 10;
const TIMEOUT_MS = 15000;

/** A product page an importer's own search named for this exact model, before the page itself is fetched. */
export interface ShopifyProductRef { url: string; title: string }

/** The subset of Shopify's predictive-search reply that is read. */
interface SuggestReply { resources?: { results?: { products?: { title?: unknown; handle?: unknown }[] } } }

/**
 * Brave barely indexes the small importers (`site:kicksown.com "Feidian
 * Ultra"` finds nothing although the page exists), but the Shopify ones
 * answer their own predictive search: `/search/suggest.json?q=<model>`
 * returns products with a `handle` and `title`. The match is fuzzy — a query
 * for one model returns its neighbours and colourways — so only products
 * that pass pageNamesExactModel on the handle's URL and the title come back,
 * and the caller still fetches each page and checks its <title> as it does
 * for a search result. No search API call is spent. Anything but a 200 with
 * the expected shape is logged and treated as "nothing found".
 */
export async function findShopifyProductPages(domain: string, brand: Brand, model: string, deps: ShopifyLookupDeps = liveDeps): Promise<ShopifyProductRef[]> {
  const url = `https://${domain}/search/suggest.json?q=${encodeURIComponent(model)}&resources%5Btype%5D=product&resources%5Blimit%5D=${LIMIT}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let reply: SuggestReply;
  try {
    const res = await deps.fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) {
      console.error(`Shopify lookup on ${domain} for ${brand.name} ${model} failed (${res.status})`);
      return [];
    }
    reply = (await res.json()) as SuggestReply;
  } catch (err) {
    console.error(`Shopify lookup on ${domain} for ${brand.name} ${model} failed:`, err instanceof Error ? err.message : err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
  const products = reply.resources?.results?.products;
  if (!Array.isArray(products)) {
    console.error(`Shopify lookup on ${domain} for ${brand.name} ${model}: reply had no resources.results.products`);
    return [];
  }
  const out: ShopifyProductRef[] = [];
  for (const p of products) {
    if (typeof p.handle !== 'string' || !p.handle) continue;
    const title = typeof p.title === 'string' ? p.title : '';
    const pageUrl = `https://${domain}/products/${p.handle}`;
    if (!pageNamesExactModel(model, pageUrl, title)) continue;
    out.push({ url: pageUrl, title });
  }
  return out;
}
