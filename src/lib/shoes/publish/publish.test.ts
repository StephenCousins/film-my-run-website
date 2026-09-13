import { describe, it, expect } from 'vitest';
import { publishCandidate, type NewShoe, type PublishDeps } from './publish';
import type { CandidateInput, GatePass } from './gate';

const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };
const page = { url: 'https://www.hoka.com/clifton-10', title: 'Clifton 10', html: '', product: null, releaseDate: new Date('2026-02-01') };
const specs = { terrain: 'road' as const, category: 'daily_trainer' as const, description: 'Cushioned daily trainer', drop_mm: 5, weight_g: 250, stack_height_mm: 40, price_gbp: 14000, release_year: 2026 };
const review = (source: string) => ({ source: source as never, source_url: `https://${source}`, expert_score: 8.5, summary: null });
const cand = (over: Partial<CandidateInput> = {}): CandidateInput => ({ id: 7, slug: 'hoka-clifton-10', brand: hoka, model: 'Clifton 10', evidence: { sources: [] }, ...over });
const pass = (over: Partial<GatePass> = {}): GatePass => ({ publish: true, brandPage: page, specs, reviews: [review('runrepeat'), review('irunfar')], releaseDate: new Date('2026-02-01'), softReasons: [], ...over });

interface Calls {
  created: NewShoe[];
  reviews: { shoeId: number; review: unknown }[];
  recomputed: number[];
  lastReviewed: number[];
  superseded: { id: number; by: number }[];
  candidates: { id: number; shoeId: number }[];
}

function fakeDeps(existing: { id: number; model: string }[] = []): { deps: PublishDeps; calls: Calls } {
  const calls: Calls = { created: [], reviews: [], recomputed: [], lastReviewed: [], superseded: [], candidates: [] };
  const deps: PublishDeps = {
    upsertShoe: async data => { calls.created.push(data); return { id: 42 }; },
    upsertReview: async (shoeId, review) => { calls.reviews.push({ shoeId, review }); },
    recomputeShoeScore: async id => { calls.recomputed.push(id); },
    markReviewed: async id => { calls.lastReviewed.push(id); },
    currentShoesOfBrand: async () => existing.map(e => ({ ...e, slug: `hoka-${e.model.toLowerCase().replace(/\s+/g, '-')}` })),
    supersede: async (id, by) => { calls.superseded.push({ id, by }); },
    markCandidatePublished: async (id, shoeId) => { calls.candidates.push({ id, shoeId }); },
  };
  return { deps, calls };
}

describe('publishCandidate', () => {
  it('creates the shoe with the right fields, upserts reviews, recomputes, marks the candidate', async () => {
    const { deps, calls } = fakeDeps();
    const r = await publishCandidate(cand(), pass(), undefined, deps);
    expect(r).toEqual({ shoeId: 42, slug: 'hoka-clifton-10', supersededSlug: null });
    expect(calls.created).toHaveLength(1);
    expect(calls.created[0]).toEqual({
      brand: 'Hoka', brand_id: 1, model: 'Clifton 10', slug: 'hoka-clifton-10',
      terrain: 'road', category: 'daily_trainer', description: 'Cushioned daily trainer',
      drop_mm: 5, weight_g: 250, stack_height_mm: 40, price_gbp: 14000,
      release_year: 2026, release_date: new Date('2026-02-01'),
      origin: 'discovery', added_by_user_id: null,
    });
    expect(calls.reviews).toHaveLength(2);
    expect(calls.reviews[0]).toEqual({ shoeId: 42, review: review('runrepeat') });
    expect(calls.recomputed).toEqual([42]);
    expect(calls.lastReviewed).toEqual([42]);
    expect(calls.candidates).toEqual([{ id: 7, shoeId: 42 }]);
    expect(calls.superseded).toEqual([]);
  });
  it('takes release_year from the release date when specs have none', async () => {
    const { deps, calls } = fakeDeps();
    await publishCandidate(cand(), pass({ specs: { ...specs, release_year: null } }), undefined, deps);
    expect(calls.created[0]).toMatchObject({ release_year: 2026 });
    const second = fakeDeps();
    await publishCandidate(cand(), pass({ specs: { ...specs, release_year: null }, releaseDate: null }), undefined, second.deps);
    expect(second.calls.created[0]).toMatchObject({ release_year: null, release_date: null });
  });
  it('supersedes only the highest lower version of the same line', async () => {
    const { deps, calls } = fakeDeps([
      { id: 10, model: 'Clifton 8' },
      { id: 11, model: 'Clifton 9' },
      { id: 12, model: 'Clifton 11' },
      { id: 13, model: 'Bondi 9' },
      { id: 14, model: 'Clifton 10' },
    ]);
    const r = await publishCandidate(cand(), pass(), undefined, deps);
    expect(calls.superseded).toEqual([{ id: 11, by: 42 }]);
    expect(r.supersededSlug).toBe('hoka-clifton-9');
  });
  it('does not supersede when no lower version exists', async () => {
    const { deps, calls } = fakeDeps([{ id: 12, model: 'Clifton 11' }, { id: 13, model: 'Bondi 9' }]);
    const r = await publishCandidate(cand(), pass(), undefined, deps);
    expect(calls.superseded).toEqual([]);
    expect(r.supersededSlug).toBeNull();
  });
  it('publishes a user suggestion with origin user and no candidate row', async () => {
    const { deps, calls } = fakeDeps();
    const r = await publishCandidate(cand({ id: 0 }), pass(), { kind: 'user', userId: 99 }, deps);
    expect(r.shoeId).toBe(42);
    expect(calls.created[0]).toMatchObject({ origin: 'user', added_by_user_id: 99 });
    expect(calls.candidates).toEqual([]);
  });
  it('is idempotent: publishing the same candidate twice upserts one shoe and does not throw', async () => {
    const rows = new Map<string, number>();
    const upserts: string[] = [];
    const { deps, calls } = fakeDeps();
    deps.upsertShoe = async data => {
      upserts.push(data.slug);
      if (!rows.has(data.slug)) rows.set(data.slug, 42);
      return { id: rows.get(data.slug)! };
    };
    const first = await publishCandidate(cand(), pass(), undefined, deps);
    const second = await publishCandidate(cand(), pass(), undefined, deps);
    expect(first.shoeId).toBe(42);
    expect(second.shoeId).toBe(42);
    expect(upserts).toEqual(['hoka-clifton-10', 'hoka-clifton-10']);
    expect(rows.size).toBe(1);
    expect(calls.candidates).toEqual([{ id: 7, shoeId: 42 }, { id: 7, shoeId: 42 }]);
  });
  it('rejects a candidate without a brand', async () => {
    const { deps, calls } = fakeDeps();
    await expect(publishCandidate(cand({ brand: null }), pass(), undefined, deps)).rejects.toThrow('brand_unresolved');
    expect(calls.created).toEqual([]);
  });
});
