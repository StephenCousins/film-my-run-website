import { completeText } from '@/lib/llm';
import type { ReviewSource } from '@prisma/client';
import { identifySource } from './taxonomy';
import { extractExplicitScore } from './scores';
import { findVersionConflict, getAdjacentVersionStrings, isComparisonArticle } from './versions';
import { urlMatchesShoe } from './slug';
import { webSearch, sleep, type SearchResult } from './search';
import { fetchPage, extractArticleText, extractFirstParagraph, extractJsonLdReviewRating, extractMetaDescription } from './html';
import { pageNamesExactModel } from './pageMatch';
import { findPages, type SiteAdapter, type SitePage } from './sitesearch';
import { REVIEW_SITE_LOOKUPS } from './sitesearch/config';

export interface ReviewDeps {
  webSearch: typeof webSearch;
  completeText: typeof completeText;
  /** A review site's own lookup (sitesearch/): the pages it names for this exact model. */
  findSitePages: (adapter: SiteAdapter, brand: string, model: string) => Promise<SitePage[]>;
  fetchPage: (url: string) => Promise<{ html: string; title: string } | null>;
  /** Rate-limit pause after each search; injected deps without one do not pause. */
  sleep?: typeof sleep;
}

const liveDeps: ReviewDeps = {
  webSearch,
  completeText,
  findSitePages: (adapter, brand, model) => findPages(adapter, brand, model),
  fetchPage: url => fetchPage(url),
  sleep,
};

/** Below this many reviews from the sites' own lookups, one web search is spent to make up the difference. */
export const MIN_SITE_REVIEWS_BEFORE_SEARCH = 2;
/** How many of a site's own matches are fetched before giving up on that site. */
const PAGES_PER_SITE = 2;
/** The opening of a review handed to the LLM when the page carries no explicit score. */
const INFER_TEXT_CHARS = 800;

async function inferScoreFromText(brand: string, model: string, text: string, deps: ReviewDeps): Promise<number | null> {
  if (!text || text.length < 60) return null;
  try {
    const answer = await deps.completeText({
      maxTokens: 100,
      prompt: `Score this running shoe review excerpt. Assign 0.0–10.0 based on sentiment toward the ${brand} ${model}.

Guide: 9.5–10 exceptional | 8.5–9.4 excellent | 7.5–8.4 good | 6.5–7.4 decent | 5–6.4 average | <5 poor

"${text.slice(0, INFER_TEXT_CHARS)}"

Reply with ONLY a number like: 8.5`,
    });
    const score = parseFloat(answer);
    if (!isNaN(score) && score >= 0 && score <= 10) return score;
  } catch { /* skip */ }
  return null;
}

async function claudeVerifyResult(brand: string, model: string, result: SearchResult, deps: ReviewDeps): Promise<{ verified: boolean; reason: string }> {
  const adjacents = getAdjacentVersionStrings(model);
  const adjacentList = adjacents.length > 0
    ? `\nWATCH OUT for these different versions (must NOT be about any of these): ${adjacents.join(', ')}`
    : '';

  try {
    const answer = await deps.completeText({
      maxTokens: 60,
      prompt: `Is this search result a review of EXACTLY the ${brand} ${model} running shoe?
${adjacentList}

Title: "${result.title}"
URL: ${result.url}
Snippet: "${result.description.slice(0, 300)}"

Rules:
- Version numbers MUST match exactly. "${model}" is specific.
- A comparison "X vs Y" only counts if it reviews and scores the ${model} individually.
- A "best of" roundup counts if it scores the ${model} individually.

Reply: YES or NO, then a 5-word reason.`,
    });
    return { verified: answer.toUpperCase().startsWith('YES'), reason: answer || 'no answer' };
  } catch {
    return { verified: false, reason: 'API error' };
  }
}

export interface ReviewResult {
  source: ReviewSource;
  source_url: string;
  expert_score: number;
  summary: string | null;
  /** How the review was found: the site's own lookup, or the web-search fallback. Not stored; reported. */
  via: 'site' | 'search';
}

const sourceLabel = (source: ReviewSource, url: string) => (source === 'other' ? new URL(url).hostname : source);

/**
 * The score a fetched review page gives the shoe: its JSON-LD review rating
 * (RTINGS, Running Shoes Guru), else an explicit "8/10", "4.5 stars" in the
 * title, meta description or the opening of the article, else the LLM's
 * read of the first paragraphs. Null when none of those produce a number —
 * a page with no score is not a review the catalogue can use.
 */
async function scoreFromPage(brand: string, model: string, page: { html: string; title: string }, deps: ReviewDeps): Promise<number | null> {
  const rated = extractJsonLdReviewRating(page.html);
  if (rated !== null) return rated;
  const text = extractArticleText(page.html);
  const explicit = extractExplicitScore([page.title, extractMetaDescription(page.html) ?? '', text].join(' '));
  if (explicit !== null) return explicit;
  return inferScoreFromText(brand, model, text.slice(0, INFER_TEXT_CHARS), deps);
}

/** The page's meta description, else its first real paragraph, at most 200 characters. */
function summaryFromPage(html: string): string | null {
  const description = extractMetaDescription(html);
  const text = description && description.length >= 40 ? description : extractFirstParagraph(html) ?? description;
  return text ? text.replace(/<[^>]*>/g, '').slice(0, 200) : null;
}

/**
 * Reviews from the sites' own lookups (REVIEW_SITE_LOOKUPS, in order). Each
 * page a site names is fetched and its <title> re-checked against the
 * model; the first page with a score wins that source. A site that refuses
 * its search (`unreachable:`) is logged and skipped; the web-search fallback
 * covers it that week.
 */
async function reviewsFromSites(brand: string, model: string, onProgress: ((msg: string) => void) | undefined, deps: ReviewDeps): Promise<ReviewResult[]> {
  const found: ReviewResult[] = [];
  const seen = new Set<ReviewSource>();
  for (const { source, adapter } of REVIEW_SITE_LOOKUPS) {
    if (seen.has(source)) continue;
    let pages: SitePage[];
    try {
      pages = await deps.findSitePages(adapter, brand, model);
    } catch (err) {
      console.error(`Review lookup (${source}) for ${brand} ${model} failed: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    for (const candidate of pages.slice(0, PAGES_PER_SITE)) {
      let page: { html: string; title: string } | null;
      try {
        page = await deps.fetchPage(candidate.url);
      } catch {
        continue;
      }
      if (!page || !pageNamesExactModel(model, candidate.url, page.title)) continue;
      const score = await scoreFromPage(brand, model, page, deps);
      if (score === null) continue;
      onProgress?.(`Found review: ${sourceLabel(source, candidate.url)} (${score}/10)`);
      found.push({ source, source_url: candidate.url, expert_score: score, summary: summaryFromPage(page.html), via: 'site' });
      seen.add(source);
      break;
    }
  }
  return found;
}

/**
 * Reviews from one web search's results, as before the site lookups
 * existed: one per source, the model named in the title or snippet, no
 * neighbouring version, an LLM check for comparisons and off-slug URLs, and
 * a score read from the snippet or inferred from it.
 */
async function reviewsFromSearch(brand: string, model: string, results: SearchResult[], taken: Set<ReviewSource>, onProgress: ((msg: string) => void) | undefined, deps: ReviewDeps): Promise<ReviewResult[]> {
  const found: ReviewResult[] = [];
  const seenSources = new Set(taken);

  for (const result of results) {
    const source = identifySource(result.url);
    if (seenSources.has(source)) continue;

    const combined = `${result.title} ${result.description}`;

    if (!combined.toLowerCase().includes(model.toLowerCase())) continue;

    const conflict = findVersionConflict(model, result.title);
    if (conflict) continue;

    const urlMatch = urlMatchesShoe(result.url, brand, model);
    const isComparison = isComparisonArticle(model, combined);

    const needsVerify = isComparison || !urlMatch;
    if (needsVerify) {
      onProgress?.(`Verifying ${sourceLabel(source, result.url)}...`);
      const { verified } = await claudeVerifyResult(brand, model, result, deps);
      if (!verified) continue;
    }

    let score = extractExplicitScore(combined);
    if (score === null && result.description.length > 60) {
      onProgress?.(`Extracting score from ${sourceLabel(source, result.url)}...`);
      score = await inferScoreFromText(brand, model, result.description, deps);
    }

    if (score !== null) {
      seenSources.add(source);
      onProgress?.(`Found review: ${sourceLabel(source, result.url)} (${score}/10)`);
      found.push({
        source,
        source_url: result.url,
        expert_score: score,
        summary: result.description.replace(/<[^>]*>/g, '').slice(0, 200) || null,
        via: 'search',
      });
    }
  }

  return found;
}

/**
 * One review per source for a shoe. The review sites are asked directly
 * first (reviewsFromSites: no search call, and the score comes from the
 * review page itself). Only when fewer than MIN_SITE_REVIEWS_BEFORE_SEARCH
 * came back is one web search spent — `"<brand> <model>" running shoe
 * review` — and its results handled as they always were; that is how
 * RunRepeat and Road Trail Run, which refuse server fetches, still get in.
 */
export async function fetchReviewsForShoe(
  brand: string,
  model: string,
  onProgress?: (msg: string) => void,
  deps: ReviewDeps = liveDeps
): Promise<ReviewResult[]> {
  onProgress?.(`Asking the review sites...`);
  const reviews = await reviewsFromSites(brand, model, onProgress, deps);
  if (reviews.length >= MIN_SITE_REVIEWS_BEFORE_SEARCH) return reviews;

  onProgress?.(`Searching for reviews...`);
  const results = await deps.webSearch(`"${brand} ${model}" running shoe review`);
  await (deps.sleep ?? (async () => {}))(1100);
  const taken = new Set(reviews.map(r => r.source));
  return [...reviews, ...(await reviewsFromSearch(brand, model, results, taken, onProgress, deps))];
}
