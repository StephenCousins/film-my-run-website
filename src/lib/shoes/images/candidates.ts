import type { Brand } from '../brands';
import { findVersionConflict } from '../versions';
import { webSearch, sleep } from '../search';
import { fetchPage, extractJsonLdProducts, extractMetaImages, type JsonLdProduct } from '../html';
import { pageNamesExactModel, type BrandPage } from '../publish/brandPage';

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

export interface ImageCandidatesDeps {
  webSearch: typeof webSearch;
  fetchPage: (url: string) => Promise<{ html: string; title: string } | null>;
  /** Rate-limit pause between retailer searches. Injected deps without one do not pause. */
  sleep?: typeof sleep;
}

const liveDeps: ImageCandidatesDeps = { webSearch, fetchPage: url => fetchPage(url), sleep };

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

/**
 * Which JSON-LD Products on an accepted page may supply images. The walker
 * in html.ts also returns related-product carousels (ItemList entries), and
 * those are exactly how a hiking boot ended up on a running shoe. Products
 * whose name names this exact model are used. If none does, the page's only
 * Product is used when its name does not point at another version (brand
 * pages often name it "Men's Clifton" with no number) — but never one of
 * several, because then there is no way to tell the page's own product from
 * the carousel.
 */
function productsForModel(products: JsonLdProduct[], model: string): JsonLdProduct[] {
  const named = products.filter(p => p.name && pageNamesExactModel(model, '', p.name));
  if (named.length > 0) return named;
  if (products.length === 1 && !nameConflicts(model, products[0].name)) return [products[0]];
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

/** Brave's site: operator occasionally leaks other hosts; a candidate must come from the domain that was asked for. */
function onDomain(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

function dedupe(candidates: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  return candidates.filter(c => (seen.has(c.url) ? false : (seen.add(c.url), true)));
}

/**
 * Image candidates in order of trust: the brand's own product page (JSON-LD
 * Product images, then og/twitter images), then the first retailer whose
 * page provably names this exact model and version. Retailer pages are only
 * accepted on the same rule as the brand page; the search-result title is not
 * trusted, the fetched <title> is. There is deliberately no image-search
 * fallback: every mismatched image in the old catalogue came from one.
 */
export async function imageCandidates(input: ImageCandidatesInput, deps: ImageCandidatesDeps = liveDeps): Promise<ImageCandidate[]> {
  const { brand, model, brandPage } = input;
  const candidates: ImageCandidate[] = [];

  if (brandPage) candidates.push(...pageImages(brandPage.html, brandPage.url, model, ['brand-jsonld', 'brand-og']));

  const pause = deps.sleep ?? (async () => {});
  for (let i = 0; i < RETAILER_DOMAINS.length; i++) {
    const domain = RETAILER_DOMAINS[i];
    if (i > 0) await pause(1100);
    const results = (await deps.webSearch(`site:${domain} "${brand.name} ${model}"`, RESULTS_PER_DOMAIN)).slice(0, RESULTS_PER_DOMAIN);

    const found: ImageCandidate[] = [];
    for (const result of results) {
      if (!onDomain(result.url, domain)) continue;
      const kind = isProductPageUrl(result.url);
      if (!kind.isProduct && kind.isArticle) continue;
      const page = await deps.fetchPage(result.url);
      if (!page) continue;
      if (!pageNamesExactModel(model, result.url, page.title)) continue;
      found.push(...pageImages(page.html, result.url, model, ['retailer-jsonld', 'retailer-og']));
    }
    if (found.length > 0) {
      candidates.push(...found);
      break;
    }
  }

  return dedupe(candidates);
}
