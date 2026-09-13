import type { Brand } from '../brands';
import { fetchReviewsForShoe, type ReviewResult } from '../reviews';
import { parseShoeSpecs, type ParsedSpecs } from '../specs';
import { findBrandProductPage, type BrandPage, type BrandPageResult } from './brandPage';
import { findRetailerProductPage } from './retailerPage';

export type HoldReason = 'brand_unresolved' | 'no_brand_page' | 'too_old' | 'reviews_lt_2' | 'bad_taxonomy' | 'specs_unparseable';

export interface CandidateInput {
  id: number;
  slug: string;
  brand: Brand | null;
  model: string;
  evidence: { sources: { source: string; url: string; title: string; publishedAt: string | null }[] };
}

export interface GatePass {
  publish: true;
  brandPage: BrandPage;
  specs: ParsedSpecs;
  reviews: ReviewResult[];
  releaseDate: Date | null;
  softReasons: [] | ['no_image'];
}

export interface GateHold {
  publish: false;
  reasons: HoldReason[];
  /** `brandUnreachable` is the fetch error when the brand site refused and no retailer page matched either. */
  partial: { brandPage?: BrandPage; reviews?: ReviewResult[]; brandUnreachable?: string };
}

export interface GateDeps {
  findBrandProductPage: (brand: Brand, model: string) => Promise<BrandPageResult>;
  findRetailerProductPage: (brand: Brand, model: string) => Promise<BrandPage | null>;
  fetchReviewsForShoe: (brand: string, model: string) => Promise<ReviewResult[]>;
  parseShoeSpecs: (input: { brand: string; model: string; context: string }) => Promise<ParsedSpecs>;
  now: () => Date;
}

const liveDeps: GateDeps = {
  findBrandProductPage: (brand, model) => findBrandProductPage(brand, model),
  findRetailerProductPage: (brand, model) => findRetailerProductPage(brand, model),
  fetchReviewsForShoe: (brand, model) => fetchReviewsForShoe(brand, model),
  parseShoeSpecs: input => parseShoeSpecs(input),
  now: () => new Date(),
};

export const MAX_AGE_MONTHS = 15;

/** Visible page text for the spec parser: scripts out, tags out, whitespace collapsed. */
function pageText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2500);
}

/**
 * Decide whether a candidate is ready to publish. Cheapest checks first, and
 * each hold carries whatever was gathered so far so a re-run or a manual
 * override does not repeat the paid calls. A release date that is unknown
 * does not hold: the brand page itself is the evidence of currency.
 *
 * The brand page is the proof the shoe exists at this version. When the
 * brand's site refuses the fetch (Hoka 406, Brooks 403) a retailer page that
 * names the exact model stands in for it; `no_brand_page` is held only when
 * the brand site answered and has no such page, or refused and no retailer
 * has one either.
 */
export async function evaluate(c: CandidateInput, deps: GateDeps = liveDeps, opts: { override?: HoldReason[] } = {}): Promise<GatePass | GateHold> {
  const ignore = new Set(opts.override ?? []);
  if (!c.brand) return { publish: false, reasons: ['brand_unresolved'], partial: {} };

  const found = await deps.findBrandProductPage(c.brand, c.model);
  if (found.kind === 'absent') return { publish: false, reasons: ['no_brand_page'], partial: {} };
  let brandPage: BrandPage;
  if (found.kind === 'found') {
    brandPage = found.page;
  } else {
    const retailer = await deps.findRetailerProductPage(c.brand, c.model);
    if (!retailer) return { publish: false, reasons: ['no_brand_page'], partial: { brandUnreachable: found.reason } };
    brandPage = retailer;
  }

  const reviewDates = c.evidence.sources.map(s => s.publishedAt).filter((d): d is string => !!d).map(d => new Date(d));
  const releaseDate = brandPage.releaseDate ?? (reviewDates.length ? new Date(Math.min(...reviewDates.map(d => d.getTime()))) : null);
  const cutoff = new Date(deps.now()); cutoff.setMonth(cutoff.getMonth() - MAX_AGE_MONTHS);
  if (releaseDate && releaseDate < cutoff && !ignore.has('too_old')) return { publish: false, reasons: ['too_old'], partial: { brandPage } };

  const reviews = await deps.fetchReviewsForShoe(c.brand.name, c.model);
  if (reviews.length < 2 && !ignore.has('reviews_lt_2')) return { publish: false, reasons: ['reviews_lt_2'], partial: { brandPage, reviews } };

  let specs: ParsedSpecs;
  try {
    const p = brandPage.product;
    const context = [brandPage.title, p?.name, p?.description, pageText(brandPage.html)].filter(Boolean).join('\n');
    specs = await deps.parseShoeSpecs({ brand: c.brand.name, model: c.model, context });
  } catch (err) {
    const reason: HoldReason = err instanceof Error && err.message === 'bad_taxonomy' ? 'bad_taxonomy' : 'specs_unparseable';
    return { publish: false, reasons: [reason], partial: { brandPage, reviews } };
  }
  return { publish: true, brandPage, specs, reviews, releaseDate, softReasons: [] };
}
