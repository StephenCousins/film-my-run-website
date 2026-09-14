import { describe, it, expect, vi } from 'vitest';
import { discover, mergeEvidenceSources } from './index';

const brands = [{ id: 1, name: 'Hoka', aliases: ['hoka'], domain: 'hoka.com', newArrivalsUrl: null }];
const nom = (title: string, source: string) => ({ modelText: title, title, url: `https://x/${title}`, publishedAt: new Date('2026-09-01'), source });
const noBumps = async () => ({ source: 'version-bump', nominations: [], empty: true, stores: [] });

describe('discover', () => {
  it('upserts new candidates, skips known slugs and same-line-same-version, reports empty feeds', async () => {
    const upserts: unknown[] = [];
    const r = await discover({
      readAllFeeds: async () => [
        { source: 'a', nominations: [nom('Hoka Clifton 10 review', 'a'), nom('Hoka Bondi 9 review', 'a')], empty: false },
        { source: 'b', nominations: [], empty: true, error: '403' },
      ],
      readAllShopifyNewArrivals: async () => [{ source: 'shopify:startfitness.co.uk', nominations: [{ ...nom('Novablast 5', 'shopify:startfitness.co.uk'), brandText: 'Asics' }], empty: false, stores: [{ store: 'shopify:startfitness.co.uk', fetched: 250, nominated: 1 }] }],
      readVersionBumps: async () => ({ source: 'version-bump', nominations: [{ ...nom('Hoka Clifton 11', 'version-bump'), brandText: 'Hoka', modelText: 'Clifton 11', publishedAt: null }], empty: false, stores: [{ store: 'version-bump:startfitness.co.uk', fetched: 2, nominated: 1 }, { store: 'version-bump:kicksown.com', fetched: 2, nominated: 0 }] }),
      loadBrands: async () => brands,
      completeText: async () => JSON.stringify([{ i: 0, brand: 'Hoka', model: 'Clifton 10' }, { i: 1, brand: 'Hoka', model: 'Bondi 9' }, { i: 2, brand: 'Asics', model: 'Novablast 5' }, { i: 3, brand: 'Hoka', model: 'Clifton 11' }]),
      existingSlugs: async () => [{ slug: 'hoka-bondi-9', brand: 'Hoka', model: 'Bondi 9' }],
      upsertCandidate: async c => { upserts.push(c); },
    });
    expect(r).toMatchObject({ nominations: 4, feeds: 2, shops: 1, versionBumps: 1, candidatesUpserted: 3, alreadyKnown: 1, feedsEmpty: ['b (403)'], storesEmpty: ['version-bump:kicksown.com'], normaliseFailed: false });
    expect(r.stores).toHaveLength(3);
    expect(upserts[0]).toMatchObject({ slug: 'hoka-clifton-10', brandId: 1, holdReasons: [] });
    expect(upserts[1]).toMatchObject({ slug: 'hoka-clifton-11', brandId: 1, holdReasons: [], evidence: { sources: [{ source: 'version-bump', publishedAt: null }] } });
    expect(upserts[2]).toMatchObject({ slug: 'asics-novablast-5', brandId: null, holdReasons: ['brand_unresolved'] });
  });

  it('treats a differently-spelled same-line-same-version catalogue entry as known', async () => {
    const upserts: unknown[] = [];
    const r = await discover({
      readAllFeeds: async () => [{ source: 'a', nominations: [nom('New Balance 1080 v14', 'a')], empty: false }],
      readAllShopifyNewArrivals: async () => [],
      readVersionBumps: noBumps,
      loadBrands: async () => [{ id: 3, name: 'New Balance', aliases: ['nb'], domain: 'newbalance.co.uk', newArrivalsUrl: null }],
      completeText: async () => JSON.stringify([{ i: 0, brand: 'New Balance', model: '1080 v14' }]),
      existingSlugs: async () => [{ slug: 'new-balance-fresh-foam-1080-v14', brand: 'New Balance', model: '1080 V14' }],
      upsertCandidate: async c => { upserts.push(c); },
    });
    expect(r).toMatchObject({ candidatesUpserted: 0, alreadyKnown: 1 });
    expect(upserts).toHaveLength(0);
  });

  it('a store with no new arrivals, or a refused lookup, is listed among the empty stores with its error, apart from the feeds', async () => {
    const kicksown = { store: 'shopify:kicksown.com', fetched: 250, nominated: 0 };
    const norda = { store: 'shopify:nordarun.com', fetched: 0, nominated: 0, error: 'unreachable:503' };
    const bumps = { store: 'version-bump:startfitness.co.uk', fetched: 0, nominated: 0, error: 'unreachable:403' };
    const r = await discover({
      readAllFeeds: async () => [{ source: 'quiet', nominations: [], empty: true }],
      readAllShopifyNewArrivals: async () => [
        { source: 'shopify:kicksown.com', nominations: [], empty: true, stores: [kicksown] },
        { source: 'shopify:nordarun.com', nominations: [], empty: true, error: 'unreachable:503', stores: [norda] },
      ],
      readVersionBumps: async () => ({ source: 'version-bump', nominations: [], empty: true, error: 'startfitness.co.uk (unreachable:403)', stores: [bumps] }),
      loadBrands: async () => brands,
      completeText: async () => { throw new Error('should not be called with no nominations'); },
      existingSlugs: async () => [],
      upsertCandidate: async () => {},
    });
    expect(r).toEqual({
      nominations: 0, feeds: 0, shops: 0, versionBumps: 0, candidatesUpserted: 0, alreadyKnown: 0,
      feedsEmpty: ['quiet'],
      storesEmpty: ['shopify:kicksown.com', 'shopify:nordarun.com (unreachable:503)', 'version-bump:startfitness.co.uk (unreachable:403)'],
      stores: [kicksown, norda, bumps],
      normaliseFailed: false,
    });
  });

  it('a quiet feed is listed bare, a failed one with its error, and an unparseable LLM reply is flagged', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const upserts: unknown[] = [];
    const r = await discover({
      readAllFeeds: async () => [
        { source: 'quiet', nominations: [], empty: true },
        { source: 'blocked', nominations: [], empty: true, error: 'HTTP 403' },
        { source: 'a', nominations: [nom('Hoka Clifton 10 review', 'a')], empty: false },
      ],
      readAllShopifyNewArrivals: async () => [],
      readVersionBumps: noBumps,
      loadBrands: async () => brands,
      completeText: async () => 'I cannot help with that.',
      existingSlugs: async () => [],
      upsertCandidate: async c => { upserts.push(c); },
    });
    expect(r).toEqual({ nominations: 1, feeds: 1, shops: 0, versionBumps: 0, candidatesUpserted: 0, alreadyKnown: 0, feedsEmpty: ['quiet', 'blocked (HTTP 403)'], storesEmpty: [], stores: [], normaliseFailed: true });
    expect(upserts).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('serialises evidence with ISO dates and null for undated nominations', async () => {
    const upserts: { evidence: { sources: { publishedAt: string | null; url: string }[] } }[] = [];
    await discover({
      readAllFeeds: async () => [{ source: 'a', nominations: [nom('Hoka Clifton 10 review', 'a'), { ...nom('Clifton 10 launch', 'a'), publishedAt: null, url: 'https://x/launch' }], empty: false }],
      readAllShopifyNewArrivals: async () => [],
      readVersionBumps: noBumps,
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
