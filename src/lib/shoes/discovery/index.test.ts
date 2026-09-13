import { describe, it, expect } from 'vitest';
import { discover, mergeEvidenceSources } from './index';

const brands = [{ id: 1, name: 'Hoka', aliases: ['hoka'], domain: 'hoka.com', newArrivalsUrl: null }];
const nom = (title: string, source: string) => ({ modelText: title, title, url: `https://x/${title}`, publishedAt: new Date('2026-09-01'), source });

describe('discover', () => {
  it('upserts new candidates, skips known slugs and same-line-same-version, reports empty feeds', async () => {
    const upserts: unknown[] = [];
    const r = await discover({
      readAllFeeds: async () => [
        { source: 'a', nominations: [nom('Hoka Clifton 10 review', 'a'), nom('Hoka Bondi 9 review', 'a')], empty: false },
        { source: 'b', nominations: [], empty: true, error: '403' },
      ],
      readBrandNewArrivals: async () => ({ source: 'brand:Hoka', nominations: [], empty: true }),
      searchNominations: async () => ({ source: 'search', nominations: [nom('Asics Novablast 5', 'search')], empty: false }),
      loadBrands: async () => brands,
      completeText: async () => JSON.stringify([{ i: 0, brand: 'Hoka', model: 'Clifton 10' }, { i: 1, brand: 'Hoka', model: 'Bondi 9' }, { i: 2, brand: 'Asics', model: 'Novablast 5' }]),
      existingSlugs: async () => [{ slug: 'hoka-bondi-9', brand: 'Hoka', model: 'Bondi 9' }],
      upsertCandidate: async c => { upserts.push(c); },
    });
    expect(r).toMatchObject({ nominations: 3, candidatesUpserted: 2, alreadyKnown: 1, feedsEmpty: ['b'] });
    expect(upserts[0]).toMatchObject({ slug: 'hoka-clifton-10', brandId: 1, holdReasons: [] });
    expect(upserts[1]).toMatchObject({ slug: 'asics-novablast-5', brandId: null, holdReasons: ['brand_unresolved'] });
  });

  it('treats a differently-spelled same-line-same-version catalogue entry as known', async () => {
    const upserts: unknown[] = [];
    const r = await discover({
      readAllFeeds: async () => [{ source: 'a', nominations: [nom('New Balance 1080 v14', 'a')], empty: false }],
      readBrandNewArrivals: async () => ({ source: 'brand:x', nominations: [], empty: true }),
      searchNominations: async () => ({ source: 'search', nominations: [], empty: true }),
      loadBrands: async () => [{ id: 3, name: 'New Balance', aliases: ['nb'], domain: 'newbalance.co.uk', newArrivalsUrl: null }],
      completeText: async () => JSON.stringify([{ i: 0, brand: 'New Balance', model: '1080 v14' }]),
      existingSlugs: async () => [{ slug: 'new-balance-fresh-foam-1080-v14', brand: 'New Balance', model: '1080 V14' }],
      upsertCandidate: async c => { upserts.push(c); },
    });
    expect(r).toMatchObject({ candidatesUpserted: 0, alreadyKnown: 1 });
    expect(upserts).toHaveLength(0);
  });

  it('only reads brand pages for brands that have a new-arrivals URL, and does not count them as empty feeds', async () => {
    const asked: string[] = [];
    const r = await discover({
      readAllFeeds: async () => [],
      readBrandNewArrivals: async b => { asked.push(b.name); return { source: `brand:${b.name}`, nominations: [], empty: true }; },
      searchNominations: async () => ({ source: 'search', nominations: [], empty: true }),
      loadBrands: async () => [
        { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: 'https://hoka.com/new' },
        { id: 2, name: 'Asics', aliases: [], domain: 'asics.com', newArrivalsUrl: null },
      ],
      completeText: async () => { throw new Error('should not be called with no nominations'); },
      existingSlugs: async () => [],
      upsertCandidate: async () => {},
    });
    expect(asked).toEqual(['Hoka']);
    expect(r).toEqual({ nominations: 0, candidatesUpserted: 0, alreadyKnown: 0, feedsEmpty: [] });
  });

  it('serialises evidence with ISO dates and null for undated nominations', async () => {
    const upserts: { evidence: { sources: { publishedAt: string | null; url: string }[] } }[] = [];
    await discover({
      readAllFeeds: async () => [{ source: 'a', nominations: [nom('Hoka Clifton 10 review', 'a'), { ...nom('Clifton 10 launch', 'a'), publishedAt: null, url: 'https://x/launch' }], empty: false }],
      readBrandNewArrivals: async () => ({ source: 'brand:x', nominations: [], empty: true }),
      searchNominations: async () => ({ source: 'search', nominations: [], empty: true }),
      loadBrands: async () => brands,
      completeText: async () => JSON.stringify([{ i: 0, brand: 'Hoka', model: 'Clifton 10' }, { i: 1, brand: 'Hoka', model: 'Clifton 10' }]),
      existingSlugs: async () => [],
      upsertCandidate: async c => { upserts.push(c); },
    });
    expect(upserts).toHaveLength(1);
    expect(upserts[0].evidence.sources).toEqual([
      { source: 'a', url: 'https://x/Hoka Clifton 10 review', title: 'Hoka Clifton 10 review', publishedAt: '2026-09-01T00:00:00.000Z' },
      { source: 'a', url: 'https://x/launch', title: 'Clifton 10 launch', publishedAt: null },
    ]);
  });
});

describe('mergeEvidenceSources', () => {
  const a = { source: 'a', url: 'https://x/1', title: 't1', publishedAt: null };
  const b = { source: 'b', url: 'https://x/2', title: 't2', publishedAt: null };
  it('unions by url, keeping stored order and appending new urls', () => {
    expect(mergeEvidenceSources({ sources: [a] }, [{ ...a, title: 'renamed' }, b])).toEqual([a, b]);
  });
  it('tolerates a missing or malformed stored evidence blob', () => {
    expect(mergeEvidenceSources(null, [a])).toEqual([a]);
    expect(mergeEvidenceSources({}, [a])).toEqual([a]);
    expect(mergeEvidenceSources('junk', [a])).toEqual([a]);
  });
});
