import type { Brand } from '../brands';
import { shoeToSlug } from '../slug';
import { findVersionConflict } from '../versions';
import { webSearch, sleep } from '../search';
import { fetchPage, extractJsonLdProducts, type JsonLdProduct } from '../html';

export interface BrandPage {
  url: string;
  title: string;
  html: string;
  product: JsonLdProduct | null;
  releaseDate: Date | null;
}

export interface BrandPageDeps {
  webSearch: typeof webSearch;
  fetchPage: (url: string) => Promise<{ html: string; title: string } | null>;
  /** Rate-limit pause after the search; tests pass a no-op. */
  sleep?: typeof sleep;
}

const liveDeps: BrandPageDeps = { webSearch, fetchPage: url => fetchPage(url), sleep };

const MAX_RESULTS = 5;

function parseReleaseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The brand's own product page for this exact model. The search-result title
 * is not trusted: the fetched page's <title> decides, because that is what
 * proves the page is about this version and not a neighbouring one.
 */
export async function findBrandProductPage(brand: Brand, model: string, deps: BrandPageDeps = liveDeps): Promise<BrandPage | null> {
  const results = (await deps.webSearch(`site:${brand.domain} "${model}"`, MAX_RESULTS)).slice(0, MAX_RESULTS);
  await (deps.sleep ?? sleep)(1100);

  const modelSlug = shoeToSlug('', model).replace(/^-/, '');
  const modelLower = model.toLowerCase();

  for (const result of results) {
    const page = await deps.fetchPage(result.url);
    if (!page) continue;

    const urlMatches = result.url.toLowerCase().includes(modelSlug);
    const titleMatches = page.title.toLowerCase().includes(modelLower);
    if (!urlMatches && !titleMatches) continue;
    if (findVersionConflict(model, page.title) !== null) continue;

    const product = extractJsonLdProducts(page.html)[0] ?? null;
    return {
      url: result.url,
      title: page.title,
      html: page.html,
      product,
      releaseDate: parseReleaseDate(product?.releaseDate),
    };
  }
  return null;
}
