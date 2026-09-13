import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runWeekly, type WeeklyDeps, type ShoeRef } from './weekly';
import type { CandidateInput, GatePass, GateHold } from '../publish/gate';

const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };
const nike = { id: 2, name: 'Nike', aliases: [], domain: 'nike.com', newArrivalsUrl: null };
const page = { url: 'https://www.hoka.com/clifton-10', title: 'Clifton 10', html: '', product: null, releaseDate: new Date('2026-02-01'), source: 'brand' as const };
const specs = { terrain: 'road' as const, category: 'daily_trainer' as const, description: null, drop_mm: 5, weight_g: 250, stack_height_mm: 40, price_gbp: 14000, release_year: 2026 };
const review = (source: string) => ({ source: source as never, source_url: `https://${source}`, expert_score: 8.5, summary: null });
const passFor = (): GatePass => ({ publish: true, brandPage: page, specs, reviews: [review('runrepeat'), review('irunfar')], releaseDate: new Date('2026-02-01'), softReasons: [] });
const holdFor = (): GateHold => ({ publish: false, reasons: ['reviews_lt_2'], partial: { brandPage: page, reviews: [review('runrepeat')] } });

const clifton: CandidateInput = { id: 11, slug: 'hoka-clifton-10', brand: hoka, model: 'Clifton 10', evidence: { sources: [] } };
const pegasus: CandidateInput = { id: 12, slug: 'nike-pegasus-42', brand: nike, model: 'Pegasus 42', evidence: { sources: [] } };
const staleShoe: ShoeRef = { id: 100, slug: 'hoka-speedgoat-6', brand: hoka, model: 'Speedgoat 6' };
const imageless: ShoeRef = { id: 101, slug: 'nike-vomero-18', brand: nike, model: 'Vomero 18' };

interface Writes {
  upsertCandidate: number; publish: string[]; hold: { id: number; reasons: string[]; partial: unknown }[]; link: { id: number; shoeId: number }[];
  rejectStale: number[]; rejectCandidate: { id: number; reasons: string[] }[]; upsertReviews: { shoeId: number; n: number }[]; recompute: number[]; touch: number[]; clearImage: number; store: string[];
}

function fakeDeps(over: Partial<WeeklyDeps> = {}): { deps: WeeklyDeps; writes: Writes } {
  const writes: Writes = { upsertCandidate: 0, publish: [], hold: [], link: [], rejectStale: [], rejectCandidate: [], upsertReviews: [], recompute: [], touch: [], clearImage: 0, store: [] };
  const deps: WeeklyDeps = {
    discover: async () => { writes.upsertCandidate += 2; return { nominations: 5, candidatesUpserted: 2, alreadyKnown: 3, feedsEmpty: ['believe_in_run'], normaliseFailed: false }; },
    listCandidates: async statuses => (statuses.includes('pending') ? [clifton, pegasus] : []),
    shoeExists: async () => null,
    linkCandidate: async (id, shoeId) => { writes.link.push({ id, shoeId }); },
    evaluate: async c => (c.slug === 'hoka-clifton-10' ? passFor() : holdFor()),
    publishCandidate: async c => { writes.publish.push(c.slug); return { shoeId: 42, slug: c.slug, supersededSlug: null }; },
    holdCandidate: async (id, reasons, partial) => { writes.hold.push({ id, reasons, partial }); },
    rejectStale: async weeks => { writes.rejectStale.push(weeks); return 1; },
    rejectCandidate: async (id, reasons) => { writes.rejectCandidate.push({ id, reasons }); },
    staleShoes: async () => [staleShoe],
    fetchReviewsForShoe: async () => [review('runrepeat'), review('irunfar')],
    upsertReviews: async (shoeId, reviews) => { writes.upsertReviews.push({ shoeId, n: reviews.length }); },
    recomputeShoeScore: async id => { writes.recompute.push(id); },
    touchReviewed: async id => { writes.touch.push(id); },
    auditImages: async () => { writes.clearImage += 1; return { checked: 3, cleared: ['dead-shoe'], unverified: 0 }; },
    shoesNeedingImage: async () => [imageless],
    findBrandProductPage: async () => page,
    findAndStoreImage: async shoe => { writes.store.push(shoe.slug); return { url: `https://r2/shoes/${shoe.slug}.jpg`, sourceUrl: 's', method: 'brand-og' }; },
    now: () => new Date('2026-09-13T09:00:00Z'),
    log: () => {},
    ...over,
  };
  return { deps, writes };
}

describe('runWeekly', () => {
  // Errors are logged in full so Railway keeps the stack; the tests do not need to see them.
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });
  it('runs every stage and reports the counts', async () => {
    const { deps, writes } = fakeDeps();
    const r = await runWeekly({}, deps);
    expect(r.discovered).toBe(2);
    expect(r.feedsEmpty).toEqual(['believe_in_run']);
    expect(r.published).toEqual([{ slug: 'hoka-clifton-10', imageUrl: 'https://r2/shoes/hoka-clifton-10.jpg' }]);
    expect(r.publishedWithoutImage).toEqual([]);
    expect(r.linkedExisting).toEqual([]);
    expect(r.held).toEqual([{ id: 12, slug: 'nike-pegasus-42', reasons: ['reviews_lt_2'] }]);
    expect(r.errored).toEqual([]);
    expect(r.rejectedStale).toBe(1);
    expect(r.reviewsRefreshed).toBe(1);
    expect(r.imagesCleared).toEqual(['dead-shoe']);
    expect(r.imagesStored).toEqual(['hoka-clifton-10', 'nike-vomero-18']);
    expect(r.dryRun).toBe(false);
    expect(r.durationMs).toBeGreaterThanOrEqual(0);

    expect(writes.publish).toEqual(['hoka-clifton-10']);
    expect(writes.hold).toEqual([{ id: 12, reasons: ['reviews_lt_2'], partial: { brandPage: page, reviews: [review('runrepeat')] } }]);
    expect(writes.rejectStale).toEqual([8]);
    expect(writes.upsertReviews).toEqual([{ shoeId: 100, n: 2 }]);
    expect(writes.recompute).toEqual([100]);
    expect(writes.touch).toEqual([100]);
    expect(writes.store).toEqual(['hoka-clifton-10', 'nike-vomero-18']);
  });
  it('published shoes with no image found are listed under publishedWithoutImage', async () => {
    const { deps } = fakeDeps({ findAndStoreImage: async () => null });
    const r = await runWeekly({}, deps);
    expect(r.published).toEqual([{ slug: 'hoka-clifton-10', imageUrl: null }]);
    expect(r.publishedWithoutImage).toEqual(['hoka-clifton-10']);
    expect(r.imagesStored).toEqual([]);
  });
  it('maxPublish caps the number of candidates evaluated', async () => {
    const evaluated: string[] = [];
    const { deps, writes } = fakeDeps({
      listCandidates: async statuses => (statuses.includes('pending') ? [clifton, pegasus, { ...clifton, id: 13, slug: 'hoka-mach-7', model: 'Mach 7' }] : []),
      evaluate: async c => { evaluated.push(c.slug); return passFor(); },
    });
    const r = await runWeekly({ maxPublish: 1 }, deps);
    expect(evaluated).toEqual(['hoka-clifton-10']);
    expect(writes.publish).toEqual(['hoka-clifton-10']);
    expect(r.published).toHaveLength(1);
  });
  it('pending candidates are evaluated before held ones, whatever their age', async () => {
    const evaluated: string[] = [];
    const { deps } = fakeDeps({
      // The held one was seen first; the pending one is newer.
      listCandidates: async statuses => (statuses.includes('held') ? [pegasus] : [clifton]),
      evaluate: async c => { evaluated.push(c.slug); return passFor(); },
    });
    await runWeekly({ maxPublish: 1 }, deps);
    expect(evaluated).toEqual(['hoka-clifton-10']);
  });
  it('a candidate whose slug is already a shoe is linked, not re-published', async () => {
    const { deps, writes } = fakeDeps({ shoeExists: async slug => (slug === 'hoka-clifton-10' ? { id: 7 } : null) });
    const r = await runWeekly({}, deps);
    expect(writes.link).toEqual([{ id: 11, shoeId: 7 }]);
    expect(writes.publish).toEqual([]);
    expect(r.linkedExisting).toEqual(['hoka-clifton-10']);
    expect(r.published).toEqual([]);
    expect(r.held).toHaveLength(1);
  });
  it('a candidate that cannot link because the shoe already has one is rejected, not retried', async () => {
    const { deps, writes } = fakeDeps({
      shoeExists: async slug => (slug === 'hoka-clifton-10' ? { id: 7 } : null),
      linkCandidate: async () => { throw { code: 'P2002', message: 'Unique constraint failed on the fields: (`shoe_id`)' }; },
    });
    const r = await runWeekly({}, deps);
    expect(writes.rejectCandidate).toEqual([{ id: 11, reasons: ['shoe_already_linked'] }]);
    expect(r.linkedExisting).toEqual(['hoka-clifton-10']);
    expect(r.errored).toEqual([]);
    expect(r.held).toHaveLength(1);
  });
  it('a linked candidate does not use up a publish slot', async () => {
    const { deps, writes } = fakeDeps({ shoeExists: async slug => (slug === 'hoka-clifton-10' ? { id: 7 } : null), evaluate: async () => passFor() });
    await runWeekly({ maxPublish: 1 }, deps);
    expect(writes.publish).toEqual(['nike-pegasus-42']);
  });
  it('the stale-review and image caps are passed through', async () => {
    const limits: Record<string, number> = {};
    const { deps } = fakeDeps({
      staleShoes: async limit => { limits.stale = limit; return []; },
      shoesNeedingImage: async limit => { limits.images = limit; return []; },
    });
    await runWeekly({ maxStaleRefresh: 3, maxImages: 4 }, deps);
    expect(limits).toEqual({ stale: 3, images: 4 });
    const second = fakeDeps({
      staleShoes: async limit => { limits.stale = limit; return []; },
      shoesNeedingImage: async limit => { limits.images = limit; return []; },
    });
    await runWeekly({}, second.deps);
    expect(limits).toEqual({ stale: 10, images: 10 });
  });
  it('a shoe needing an image gets the brand page looked up first', async () => {
    const pages: string[] = [];
    const received: unknown[] = [];
    const { deps } = fakeDeps({
      findBrandProductPage: async (_b, model) => { pages.push(model); return page; },
      findAndStoreImage: async (_s, brandPage) => { received.push(brandPage); return null; },
    });
    await runWeekly({}, deps);
    expect(pages).toEqual(['Vomero 18']);
    // The published candidate reuses the gate's brand page; the imageless shoe gets a fresh lookup.
    expect(received).toEqual([page, page]);
  });
  it('dryRun reports the same numbers, calls no writing dep, and skips the image loop', async () => {
    // The fakes record every call, so an empty writes list proves runWeekly stubbed them, not the fake.
    let imageLookups = 0;
    const { deps, writes } = fakeDeps({
      shoeExists: async slug => (slug === 'nike-pegasus-42' ? { id: 9 } : null),
      shoesNeedingImage: async () => { imageLookups++; return [imageless]; },
      findBrandProductPage: async () => { imageLookups++; return page; },
    });
    const r = await runWeekly({ dryRun: true }, deps);
    expect(imageLookups).toBe(0);
    expect(r.imagesStored).toEqual([]);
    expect(r.dryRun).toBe(true);
    expect(r.published).toHaveLength(1);
    expect(r.linkedExisting).toEqual(['nike-pegasus-42']);
    expect(r.held).toHaveLength(0);
    expect(r.reviewsRefreshed).toBe(1);
    expect(r.imagesCleared).toEqual(['dead-shoe']);
    expect(r.rejectedStale).toBe(0);
    expect(writes.publish).toEqual([]);
    expect(writes.hold).toEqual([]);
    expect(writes.link).toEqual([]);
    expect(writes.rejectStale).toEqual([]);
    expect(writes.rejectCandidate).toEqual([]);
    expect(writes.upsertReviews).toEqual([]);
    expect(writes.recompute).toEqual([]);
    expect(writes.touch).toEqual([]);
    expect(writes.store).toEqual([]);
  });
  it('a dep that throws for one candidate lands in errored and the run continues', async () => {
    const { deps, writes } = fakeDeps({
      evaluate: async c => { if (c.slug === 'hoka-clifton-10') throw new Error('brave 429'); return holdFor(); },
      fetchReviewsForShoe: async () => { throw new Error('search down'); },
      findAndStoreImage: async () => { throw new Error('vision down'); },
    });
    const r = await runWeekly({}, deps);
    expect(r.errored).toEqual([
      { slug: 'hoka-clifton-10', error: 'brave 429' },
      { slug: 'hoka-speedgoat-6', error: 'search down' },
      { slug: 'nike-vomero-18', error: 'vision down' },
    ]);
    expect(r.held).toEqual([{ id: 12, slug: 'nike-pegasus-42', reasons: ['reviews_lt_2'] }]);
    expect(writes.hold).toHaveLength(1);
    expect(r.reviewsRefreshed).toBe(0);
    expect(r.imagesCleared).toEqual(['dead-shoe']);
  });
  it('an unparseable normalise reply is reported under errored', async () => {
    const { deps } = fakeDeps({ discover: async () => ({ nominations: 9, candidatesUpserted: 0, alreadyKnown: 0, feedsEmpty: [], normaliseFailed: true }) });
    const r = await runWeekly({}, deps);
    expect(r.errored).toEqual([{ slug: 'discover', error: 'LLM normalise output was unparseable; 9 nominations dropped' }]);
  });
  it('a failing discover is reported, not fatal', async () => {
    const { deps } = fakeDeps({ discover: async () => { throw new Error('feeds down'); } });
    const r = await runWeekly({}, deps);
    expect(r.errored).toEqual([{ slug: 'discover', error: 'feeds down' }]);
    expect(r.discovered).toBe(0);
    expect(r.published).toHaveLength(1);
  });
  it('a candidate that publishes but whose image search throws stays published', async () => {
    const { deps } = fakeDeps({ findAndStoreImage: async () => { throw new Error('vision down'); }, shoesNeedingImage: async () => [] });
    const r = await runWeekly({}, deps);
    expect(r.published).toEqual([{ slug: 'hoka-clifton-10', imageUrl: null }]);
    expect(r.publishedWithoutImage).toEqual(['hoka-clifton-10']);
    expect(r.errored).toEqual([{ slug: 'hoka-clifton-10', error: 'vision down' }]);
  });
});
