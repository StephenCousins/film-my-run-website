import { describe, it, expect } from 'vitest';
import { evaluate, MAX_AGE_MONTHS } from './gate';
import type { BrandPage } from './brandPage';

const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };
const page = { url: 'https://www.hoka.com/clifton-10', title: 'Clifton 10', html: '', product: null, releaseDate: new Date('2026-02-01'), source: 'brand' as const };
const specs = { terrain: 'road' as const, category: 'daily_trainer' as const, description: 'x', drop_mm: 5, weight_g: 250, stack_height_mm: 40, price_gbp: 14000, release_year: 2026 };
const review = (source: string) => ({ source: source as never, source_url: `https://${source}`, expert_score: 8.5, summary: null });
const cand = (over: Partial<Parameters<typeof evaluate>[0]> = {}) => ({ id: 1, slug: 'hoka-clifton-10', brand: hoka, model: 'Clifton 10', evidence: { sources: [] }, ...over });
const found = (p: BrandPage = page) => ({ kind: 'found' as const, page: p });
const ok = () => ({ findBrandProductPage: async () => found(), findRetailerProductPage: async () => null, fetchReviewsForShoe: async () => [review('runrepeat'), review('irunfar')], parseShoeSpecs: async () => specs, now: () => new Date('2026-09-13') });

describe('evaluate', () => {
  it('exports the age limit', () => {
    expect(MAX_AGE_MONTHS).toBe(15);
  });
  it('passes with brand page, recent release, two reviews', async () => {
    const r = await evaluate(cand(), ok());
    expect(r.publish).toBe(true);
    expect(r).toMatchObject({ brandPage: page, specs, releaseDate: new Date('2026-02-01'), softReasons: [] });
    if (r.publish) expect(r.reviews).toHaveLength(2);
  });
  it('holds brand_unresolved without calling anything', async () => {
    let called = false;
    const r = await evaluate(cand({ brand: null }), { ...ok(), findBrandProductPage: async () => { called = true; return found(); } });
    expect(r).toMatchObject({ publish: false, reasons: ['brand_unresolved'] });
    expect(called).toBe(false);
  });
  it('holds no_brand_page when the brand site answers and has no page, without asking retailers', async () => {
    let retailerAsked = false;
    const r = await evaluate(cand(), { ...ok(), findBrandProductPage: async () => ({ kind: 'absent' }), findRetailerProductPage: async () => { retailerAsked = true; return null; } });
    expect(r).toEqual({ publish: false, reasons: ['no_brand_page'], partial: {} });
    expect(retailerAsked).toBe(false);
  });
  it('an unreachable brand site with a matching retailer page passes, sourced retailer', async () => {
    const retailerPage = { ...page, url: 'https://www.sportsshoes.com/product/hoka-clifton-10', source: 'retailer' as const };
    const r = await evaluate(cand(), { ...ok(), findBrandProductPage: async () => ({ kind: 'unreachable', reason: 'unreachable:406' }), findRetailerProductPage: async () => retailerPage });
    expect(r.publish).toBe(true);
    if (r.publish) expect(r.brandPage).toEqual(retailerPage);
  });
  it('an unreachable brand site with no retailer page holds no_brand_page and records the refusal', async () => {
    const r = await evaluate(cand(), { ...ok(), findBrandProductPage: async () => ({ kind: 'unreachable', reason: 'unreachable:403' }), findRetailerProductPage: async () => null });
    expect(r).toEqual({ publish: false, reasons: ['no_brand_page'], partial: { brandUnreachable: 'unreachable:403' } });
  });
  it('holds too_old using the brand releaseDate', async () => {
    const r = await evaluate(cand(), { ...ok(), findBrandProductPage: async () => found({ ...page, releaseDate: new Date('2024-01-01') }) });
    expect(r).toMatchObject({ publish: false, reasons: ['too_old'] });
  });
  it('holds too_old before fetching reviews', async () => {
    let called = false;
    const r = await evaluate(cand(), {
      ...ok(),
      findBrandProductPage: async () => found({ ...page, releaseDate: new Date('2024-01-01') }),
      fetchReviewsForShoe: async () => { called = true; return []; },
    });
    expect(r.publish).toBe(false);
    expect(called).toBe(false);
  });
  it('falls back to the earliest review date when the brand page has none', async () => {
    const r = await evaluate(cand({ evidence: { sources: [{ source: 'a', url: '', title: '', publishedAt: '2026-08-01T00:00:00Z' }] } }), { ...ok(), findBrandProductPage: async () => found({ ...page, releaseDate: null }) });
    expect(r.publish).toBe(true);
    expect(r).toMatchObject({ releaseDate: new Date('2026-08-01T00:00:00Z') });
  });
  it('holds too_old on the earliest review date, not the latest', async () => {
    const sources = [
      { source: 'a', url: '', title: '', publishedAt: '2026-08-01T00:00:00Z' },
      { source: 'b', url: '', title: '', publishedAt: '2024-01-01T00:00:00Z' },
      { source: 'c', url: '', title: '', publishedAt: null },
    ];
    const r = await evaluate(cand({ evidence: { sources } }), { ...ok(), findBrandProductPage: async () => found({ ...page, releaseDate: null }) });
    expect(r).toMatchObject({ publish: false, reasons: ['too_old'] });
  });
  it('does not hold on an unknown release date', async () => {
    const r = await evaluate(cand(), { ...ok(), findBrandProductPage: async () => found({ ...page, releaseDate: null }) });
    expect(r.publish).toBe(true);
    expect(r).toMatchObject({ releaseDate: null });
  });
  it('holds reviews_lt_2 and keeps the brand page as partial evidence', async () => {
    const r = await evaluate(cand(), { ...ok(), fetchReviewsForShoe: async () => [review('runrepeat')] });
    expect(r).toMatchObject({ publish: false, reasons: ['reviews_lt_2'], partial: { brandPage: page } });
    if (!r.publish) expect(r.partial.reviews).toHaveLength(1);
  });
  it('holds bad_taxonomy when specs throw it', async () => {
    const r = await evaluate(cand(), { ...ok(), parseShoeSpecs: async () => { throw new Error('bad_taxonomy'); } });
    expect(r).toMatchObject({ publish: false, reasons: ['bad_taxonomy'] });
  });
  it('holds specs_unparseable on any other specs failure', async () => {
    const r = await evaluate(cand(), { ...ok(), parseShoeSpecs: async () => { throw new Error('specs_unparseable'); } });
    expect(r).toMatchObject({ publish: false, reasons: ['specs_unparseable'], partial: { brandPage: page } });
    const r2 = await evaluate(cand(), { ...ok(), parseShoeSpecs: async () => { throw new TypeError('network'); } });
    expect(r2).toMatchObject({ publish: false, reasons: ['specs_unparseable'] });
  });
  it('builds the specs context from title, product and stripped page text', async () => {
    let seen: { brand: string; model: string; context: string } | null = null;
    const html = '<html><head><script>var x = 1;</script></head><body><h1>Clifton 10</h1><p>Weight 250g,   drop 5mm</p></body></html>';
    const r = await evaluate(cand(), {
      ...ok(),
      findBrandProductPage: async () => found({ ...page, html, product: { name: 'Clifton 10', image: [], description: 'Cushioned daily trainer' } }),
      parseShoeSpecs: async input => { seen = input; return specs; },
    });
    expect(r.publish).toBe(true);
    expect(seen).toMatchObject({ brand: 'Hoka', model: 'Clifton 10' });
    expect(seen!.context).toContain('Clifton 10\nClifton 10\nCushioned daily trainer\n');
    expect(seen!.context).toContain('Clifton 10 Weight 250g, drop 5mm');
    expect(seen!.context).not.toContain('var x');
  });
  it('override lets too_old and reviews_lt_2 through', async () => {
    const r = await evaluate(cand(), { ...ok(), fetchReviewsForShoe: async () => [], findBrandProductPage: async () => found({ ...page, releaseDate: new Date('2020-01-01') }) }, { override: ['too_old', 'reviews_lt_2'] });
    expect(r.publish).toBe(true);
    if (r.publish) expect(r.reviews).toHaveLength(0);
  });
});
