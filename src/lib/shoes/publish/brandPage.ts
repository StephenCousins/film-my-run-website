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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Does the page belong to a later numbered edition of this model? "Glycerin
 * Max" is contained in "Glycerin Max 2", and an unversioned model has no
 * neighbours for findVersionConflict to catch, so the successor's page would
 * otherwise pass on a plain substring match.
 */
function titleNamesLaterVersion(model: string, title: string): boolean {
  return new RegExp(escapeRegExp(model) + '\\s*(?:v?\\d{1,2}|ii|iii|iv|v|vi|vii|viii|ix|x)\\b', 'i').test(title);
}

function urlNamesLaterVersion(modelSlug: string, url: string): boolean {
  return new RegExp(escapeRegExp(modelSlug) + '-\\d', 'i').test(url);
}

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

    const urlMatches = result.url.toLowerCase().includes(modelSlug) && !urlNamesLaterVersion(modelSlug, result.url);
    const titleMatches = page.title.toLowerCase().includes(modelLower) && !titleNamesLaterVersion(model, page.title);
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
