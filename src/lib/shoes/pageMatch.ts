import { shoeToSlug } from './slug';
import { findVersionConflict } from './versions';

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
 * Nude, "Clifton 10 GTX" (or "Vomero 18 Gore-Tex") is not the Clifton 10. A version number after the
 * model is caught above; these are caught here — unless the word is part of
 * the model itself ("Feidian 6 Elite" is allowed its "elite").
 */
const VARIANT_WORDS = new Set(['st', 'gtx', 'gore', 'gt', 'wp', 'tr', 'pro', 'elite', 'ultra', 'max', 'plus', 'challenger', 'turbo', 'fly', 'lite', 'light', 'se', 'x']);

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
 * search, the site adapters, the review lookup and the retailer image
 * candidates so there is one definition of "the right shoe".
 */
export function pageNamesExactModel(model: string, url: string, title: string): boolean {
  const modelSlug = shoeToSlug('', model).replace(/^-/, '');
  // Whole-word matches only: "Titan" must not match "Titanium", "Ride" must not match "Rider".
  const urlWord = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(modelSlug)}(?![a-z0-9])`);
  const titleWord = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(model.toLowerCase())}(?![a-z0-9])`);
  const urlMatches = urlWord.test(url.toLowerCase()) && !urlNamesLaterVersion(modelSlug, url);
  const titleMatches = titleWord.test(title.toLowerCase()) && !titleNamesLaterVersion(model, title);
  if (!urlMatches && !titleMatches) return false;
  if (namesVariant(modelSlug, url, '-', model) || namesVariant(model, title, '[\\s-]+', model)) return false;
  return findVersionConflict(model, title) === null;
}
