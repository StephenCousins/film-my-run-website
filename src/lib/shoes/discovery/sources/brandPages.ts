import { fetchPage, extractJsonLdProducts } from '../../html';
import type { Brand } from '../../brands';
import type { Nomination, SourceResult } from '../types';

export interface BrandPageDeps { fetchPage: typeof fetchPage }

/** Nominate every Product in the JSON-LD of a brand's new-arrivals listing. */
export async function readBrandNewArrivals(brand: Brand, deps: BrandPageDeps = { fetchPage }): Promise<SourceResult> {
  const source = `brand:${brand.name}`;
  const listingUrl = brand.newArrivalsUrl;
  if (!listingUrl) return { source, nominations: [], empty: true };
  const page = await deps.fetchPage(listingUrl);
  if (!page) return { source, nominations: [], empty: true, error: 'unreachable' };
  const nominations: Nomination[] = [];
  for (const p of extractJsonLdProducts(page.html)) {
    if (!p.name) continue;
    nominations.push({
      brandText: brand.name,
      modelText: p.name,
      title: p.name,
      url: p.url ?? listingUrl,
      publishedAt: p.releaseDate ? new Date(p.releaseDate) : null,
      source,
    });
  }
  return { source, nominations, empty: nominations.length === 0 };
}
