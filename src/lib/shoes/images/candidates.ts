import type { Brand } from '../brands';
import { findVersionConflict, parseModelVersion } from '../versions';
import { extractJsonLdProducts, extractMetaImages, type JsonLdProduct } from '../html';
import { pageNamesExactModel, type BrandPage } from '../publish/brandPage';
import { searchRetailerPages, liveRetailerDeps, type RetailerPageDeps } from '../publish/retailerPage';

export { RETAILER_DOMAINS, isProductPageUrl } from '../publish/retailerPage';

export type ImageMethod = 'brand-jsonld' | 'brand-og' | 'retailer-jsonld' | 'retailer-og';

export interface ImageCandidate {
  url: string;
  method: ImageMethod;
  /** The page the image was found on — recorded so a bad image can be traced. */
  pageUrl: string;
}

export interface ImageCandidatesInput {
  brand: Brand;
  model: string;
  brandPage: BrandPage | null;
}

export type ImageCandidatesDeps = RetailerPageDeps;

const liveDeps: ImageCandidatesDeps = liveRetailerDeps;

/** JSON-LD image entries can be relative or protocol-relative; anything not http(s) after resolving is dropped. */
function resolveImageUrl(img: string, pageUrl: string): string | null {
  try {
    const resolved = new URL(img, pageUrl).toString();
    return /^https?:\/\//.test(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

/** The name belongs to a different version of this line: a neighbour, or a later edition ("Glycerin Max 2"). */
function nameConflicts(model: string, name: string | undefined): boolean {
  if (!name) return false;
  if (findVersionConflict(model, name) !== null) return true;
  return name.toLowerCase().includes(model.toLowerCase()) && !pageNamesExactModel(model, '', name);
}

/** "Men's Ghost" is the Ghost line; "Adrenaline GTS 23" alone on a Ghost 16 page is not this shoe. */
function nameIsThisLine(model: string, name: string | undefined): boolean {
  return !!name && name.toLowerCase().includes(parseModelVersion(model).base.toLowerCase());
}

/**
 * Which JSON-LD Products on an accepted page may supply images. The walker
 * in html.ts also returns related-product carousels (ItemList entries), and
 * those are exactly how a hiking boot ended up on a running shoe. Products
 * whose name names this exact model are used. If none does, the page's only
 * Product is used when its name is in this line and does not point at another
 * version (brand pages often name it "Men's Clifton" with no number) — but never one of
 * several, because then there is no way to tell the page's own product from
 * the carousel.
 */
function productsForModel(products: JsonLdProduct[], model: string): JsonLdProduct[] {
  const named = products.filter(p => p.name && pageNamesExactModel(model, '', p.name));
  if (named.length > 0) return named;
  if (products.length === 1 && !nameConflicts(model, products[0].name) && nameIsThisLine(model, products[0].name)) return [products[0]];
  return [];
}

function pageImages(html: string, pageUrl: string, model: string, methods: [ImageMethod, ImageMethod]): ImageCandidate[] {
  const out: ImageCandidate[] = [];
  for (const product of productsForModel(extractJsonLdProducts(html), model)) {
    for (const img of product.image) {
      const url = resolveImageUrl(img, pageUrl);
      if (url) out.push({ url, method: methods[0], pageUrl });
    }
  }
  for (const url of extractMetaImages(html, pageUrl)) out.push({ url, method: methods[1], pageUrl });
  return out;
}

function dedupe(candidates: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  return candidates.filter(c => (seen.has(c.url) ? false : (seen.add(c.url), true)));
}

/**
 * Candidates from the page the gate accepted: JSON-LD Product images, then
 * og/twitter images. The method records whose page it was, because a brand
 * page can be a retailer's standing in for a brand site that refuses the fetch.
 */
export function brandPageCandidates(model: string, brandPage: BrandPage | null): ImageCandidate[] {
  if (!brandPage) return [];
  const methods: [ImageMethod, ImageMethod] = brandPage.source === 'retailer' ? ['retailer-jsonld', 'retailer-og'] : ['brand-jsonld', 'brand-og'];
  return dedupe(pageImages(brandPage.html, brandPage.url, model, methods));
}

/**
 * Candidates from the first retailer domain whose exact-model pages carry any
 * images. The search and the page match live in publish/retailerPage.ts,
 * shared with the gate's brand-site fallback. There is deliberately no
 * image-search fallback: every mismatched image in the old catalogue came
 * from one.
 */
export async function retailerCandidates(brand: Brand, model: string, deps: ImageCandidatesDeps = liveDeps): Promise<ImageCandidate[]> {
  const found = await searchRetailerPages(brand, model, pages => {
    const images = pages.flatMap(p => pageImages(p.html, p.url, model, ['retailer-jsonld', 'retailer-og']));
    return images.length > 0 ? dedupe(images) : null;
  }, deps);
  return found ?? [];
}

export type ImagePhase = 'brand' | 'retailer';

/**
 * Image candidates in order of trust. `phase: 'brand'` returns only the brand
 * page's images and never searches; `phase: 'retailer'` runs the retailer
 * searches only. Without a phase both are returned together, brand first.
 * findAndStoreImage runs the brand phase through verify+store first and only
 * pays for retailer searches when nothing from the brand page stored.
 */
export async function imageCandidates(input: ImageCandidatesInput, deps: ImageCandidatesDeps = liveDeps, opts: { phase?: ImagePhase } = {}): Promise<ImageCandidate[]> {
  const { brand, model, brandPage } = input;
  if (opts.phase === 'brand') return brandPageCandidates(model, brandPage);
  if (opts.phase === 'retailer') return retailerCandidates(brand, model, deps);
  return dedupe([...brandPageCandidates(model, brandPage), ...(await retailerCandidates(brand, model, deps))]);
}
