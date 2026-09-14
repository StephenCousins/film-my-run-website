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

/** "clifton-10" contains "clifton-1"; the slug must not run straight into another digit either. */
function urlNamesLaterVersion(modelSlug: string, url: string): boolean {
  return new RegExp(escapeRegExp(modelSlug) + '-?\\d', 'i').test(url);
}

/**
 * Words that turn a model into a sibling: "Miro Nude ST" is not the Miro
 * Nude, "Clifton 10 GTX" is not the Clifton 10. A version number after the
 * model is caught above; these are caught here — unless the word is part of
 * the model itself ("Feidian 6 Elite" is allowed its "elite").
 */
const VARIANT_WORDS = new Set(['st', 'gtx', 'gt', 'wp', 'tr', 'pro', 'elite', 'ultra', 'max', 'plus', 'challenger', 'turbo', 'fly', 'lite', 'light', 'se', 'x']);

function modelWords(model: string): Set<string> {
  return new Set(model.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

/** Is any occurrence of `needle` in `text` followed (after `sep`) by a variant word that is not in the model? */
function namesVariant(needle: string, text: string, sep: string, model: string): boolean {
  const own = modelWords(model);
  const re = new RegExp(escapeRegExp(needle) + sep + '([a-z0-9]+)', 'gi');
  for (const m of text.matchAll(re)) {
    const next = m[1].toLowerCase();
    if (VARIANT_WORDS.has(next) && !own.has(next)) return true;
  }
  return false;
}

/**
 * Does this page name exactly this model and version? The URL must contain the
 * model slug, or the fetched page's <title> must contain the model; in either
 * place the model must not be followed by a version token, and the title must
 * not name a neighbouring version instead. A variant word after the model in
 * either the URL slug or the title ("Miro Nude ST", "clifton-10-gtx") rejects
 * the page outright, whichever of the two matched. Shared by the brand-page
 * search and the retailer image candidates so there is one definition of
 * "the right shoe".
 */
export function pageNamesExactModel(model: string, url: string, title: string): boolean {
  const modelSlug = shoeToSlug('', model).replace(/^-/, '');
  const urlMatches = url.toLowerCase().includes(modelSlug) && !urlNamesLaterVersion(modelSlug, url);
  const titleMatches = title.toLowerCase().includes(model.toLowerCase()) && !titleNamesLaterVersion(model, title);
  if (!urlMatches && !titleMatches) return false;
  if (namesVariant(modelSlug, url, '-', model) || namesVariant(model, title, '[\\s-]+', model)) return false;
  return findVersionConflict(model, title) === null;
}

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

/**
 * The brand's own product page for this exact model. The search-result title
 * is not trusted: the fetched page's <title> decides, because that is what
 * proves the page is about this version and not a neighbouring one. A fetch
 * the site refuses is remembered; if nothing was fetched at all and at least
 * one was refused, the result is `unreachable` rather than `absent`.
 */
export async function findBrandProductPage(brand: Brand, model: string, deps: BrandPageDeps = liveDeps): Promise<BrandPageResult> {
  const results = (await deps.webSearch(`site:${brand.domain} "${model}"`, MAX_RESULTS)).slice(0, MAX_RESULTS);
  await (deps.sleep ?? sleep)(1100);

  let fetched = 0;
  let refused: string | null = null;
  for (const result of results) {
    let page: { html: string; title: string } | null;
    try {
      page = await deps.fetchPage(result.url);
    } catch (err) {
      refused ??= err instanceof Error ? err.message : String(err);
      continue;
    }
    if (!page) continue;
    fetched++;
    if (!pageNamesExactModel(model, result.url, page.title)) continue;
    return { kind: 'found', page: toBrandPage({ url: result.url, title: page.title, html: page.html }, 'brand') };
  }
  if (fetched === 0 && refused !== null) return { kind: 'unreachable', reason: refused };
  return { kind: 'absent' };
}
