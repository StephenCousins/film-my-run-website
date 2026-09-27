import { fetchSiteText, liveSiteFetchDeps, type SiteFetchDeps } from '../../sitesearch/fetch';
import type { Nomination, SourceResult, StoreStat } from '../types';

/**
 * A server-rendered product listing, newest first, whose product links carry
 * the product name in the URL slug. The big brands' own sites refuse server
 * fetches (Adidas times out, Hoka 406, ASICS/Brooks/New Balance 403, On is a
 * client-side shell; probed 27 September 2026), so sportsshoes.com's
 * per-brand running-shoe listing sorted by `publish_date|desc` stands in for
 * them. nike.com's own new-running page is readable and lists releases before
 * the retailers do. `brand` is the canonical `shoe_brands.name`.
 */
export interface ListingPage { key: string; brand: string; url: string; link: RegExp }

const sportsshoes = (slug: string, brand: string): ListingPage => ({
  key: `sportsshoes:${slug}`,
  brand,
  url: `https://www.sportsshoes.com/products/${slug}/mens/running/shoes?page=1&sort=publish_date%7Cdesc&display=72`,
  link: /\/product\/[a-z0-9]+\/([a-z0-9%-]+)/g,
});

export const LISTING_PAGES: ListingPage[] = [
  { key: 'nike.com', brand: 'Nike', url: 'https://www.nike.com/gb/w/new-mens-running-shoes-3n82yz37v7jznik1zy7ok', link: /nike\.com\/gb\/t\/([a-z0-9-]+)(?:\/[A-Za-z0-9-]+)?/g },
  sportsshoes('nike', 'Nike'),
  sportsshoes('adidas', 'Adidas'),
  sportsshoes('hoka', 'Hoka'),
  sportsshoes('asics', 'ASICS'),
  sportsshoes('brooks', 'Brooks'),
  sportsshoes('new-balance', 'New Balance'),
  sportsshoes('on-running', 'On'),
  sportsshoes('saucony', 'Saucony'),
  sportsshoes('puma', 'Puma'),
  sportsshoes('salomon', 'Salomon'),
  sportsshoes('mizuno', 'Mizuno'),
];

/** The newest this many products per listing are put forward; the rest are older stock. */
export const LISTING_TOP = 30;

/**
 * Weatherproofed, easy-entry and city/anniversary editions of a shoe already
 * listed under its own name, and non-running footwear. Put forward, each
 * would become a candidate of its own.
 */
const NOT_A_NEW_SHOE = /gore-tex|gtx|waterproof|lite-show|easyon|run-in-|marathon|amsterdam|20-years|mules?\b|slides?\b|sandals?\b|kids|junior|hyrox|spikes?\b|evospeed|sprint|walking/;

/**
 * "nike-zoomx-streakfly-2-running-shoes---ho26" → "nike streakfly 2 running shoes".
 * Season codes (AW26, HO26) are stock labels, not names, and Nike has dropped
 * "Air Zoom", "ZoomX" and "Next%" from its names (Pegasus 42, Vaporfly 4):
 * kept, the retailer's old spelling would become a second candidate for a
 * shoe already listed under the short name.
 */
export function slugToTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-+/g, ' ')
    .replace(/\b(?:aw|ss|ho|fw|sp|su)\d{2}\b/gi, ' ')
    .replace(/\b(?:air zoom|zoomx)\b|\bnext%/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nominationsFromListing(page: ListingPage, html: string): Nomination[] {
  const seen = new Set<string>();
  const out: Nomination[] = [];
  for (const m of html.matchAll(page.link)) {
    const slug = m[1].toLowerCase();
    if (seen.has(slug)) continue;
    seen.add(slug);
    if (seen.size > LISTING_TOP) break;
    if (NOT_A_NEW_SHOE.test(slug)) continue;
    const title = slugToTitle(slug);
    out.push({ brandText: page.brand, modelText: title, title, url: new URL(m[0].startsWith('/') ? m[0] : `https://www.${m[0]}`, page.url).toString(), publishedAt: null, source: page.key });
  }
  return out;
}

/** Every listing page, one after another; a page that refuses or changes shape costs only itself and is named in the digest. */
export async function readListingPages(deps: SiteFetchDeps = liveSiteFetchDeps): Promise<SourceResult> {
  const nominations: Nomination[] = [];
  const stores: StoreStat[] = [];
  for (const page of LISTING_PAGES) {
    try {
      const html = await fetchSiteText(page.url, deps);
      const noms = html ? nominationsFromListing(page, html) : [];
      nominations.push(...noms);
      stores.push({ store: page.key, fetched: noms.length, nominated: noms.length, ...(html === null ? { error: '404' } : {}) });
    } catch (err) {
      stores.push({ store: page.key, fetched: 0, nominated: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { source: 'listing-pages', nominations, empty: nominations.length === 0, stores };
}
