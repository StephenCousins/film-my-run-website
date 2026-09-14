import { describe, it, expect } from 'vitest';
import { findRetailerProductPage, searchRetailerPages, retailersFor, RETAILER_DOMAINS, RETAILERS_BY_BRAND } from './retailerPage';
import { pageNamesExactModel } from './brandPage';
import { findShopifyProductPages } from './shopifyLookup';

const brooks = { id: 1, name: 'Brooks', aliases: [], domain: 'brooksrunning.com', newArrivalsUrl: null };
const lining = { id: 2, name: 'Li-Ning', aliases: ['lining', 'li ning'], domain: 'en.lining.com', newArrivalsUrl: null };
const qiaodan = { id: 3, name: 'Qiaodan', aliases: ['qiaodan'], domain: 'qiaodan.asia', newArrivalsUrl: null };
const noShopify = async () => { throw new Error('unexpected Shopify lookup'); };
const noResults = async () => [];
const jsonld = (name: string, img: string) => `<script type="application/ld+json">{"@type":"Product","name":"${name}","image":"${img}","releaseDate":"2026-03-01"}</script>`;
const result = (url: string) => ({ title: 'x', url, description: '' });

describe('findRetailerProductPage', () => {
  it('returns the first exact-model retailer page as a BrandPage sourced retailer, with its JSON-LD product', async () => {
    const queries: string[] = [];
    const r = await findRetailerProductPage(brooks, 'Ghost 16', {
      findShopifyProductPages: noShopify, webSearch: async q => { queries.push(q); return q.startsWith('site:runnersneed.com') ? [result('https://www.runnersneed.com/p/brooks-ghost-16')] : []; },
      fetchPage: async () => ({ html: jsonld('Ghost 16', 'https://c/16.jpg'), title: 'Brooks Ghost 16 | Runners Need' }),
    });
    expect(queries).toEqual(['site:sportsshoes.com "Brooks Ghost 16"', 'site:runnersneed.com "Brooks Ghost 16"']);
    expect(r).toMatchObject({ url: 'https://www.runnersneed.com/p/brooks-ghost-16', title: 'Brooks Ghost 16 | Runners Need', source: 'retailer' });
    expect(r?.product?.image).toEqual(['https://c/16.jpg']);
    expect(r?.releaseDate?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });
  it('rejects a neighbouring version and returns null when no domain has the page', async () => {
    const r = await findRetailerProductPage(brooks, 'Ghost 16', {
      findShopifyProductPages: noShopify, webSearch: async () => [result('https://www.sportsshoes.com/product/brooks-ghost-15')],
      fetchPage: async () => ({ html: '', title: 'Brooks Ghost 15 Mens' }),
    });
    expect(r).toBeNull();
  });
  it('skips a retailer that refuses the fetch and one whose page is gone, and carries on to the next', async () => {
    const fetched: string[] = [];
    const r = await findRetailerProductPage(brooks, 'Ghost 16', {
      findShopifyProductPages: noShopify, webSearch: async q => [result(`https://www.${q.split(' ')[0].slice(5)}/product/brooks-ghost-16`)],
      fetchPage: async url => {
        fetched.push(url);
        if (url.includes('sportsshoes')) throw new Error('unreachable:403');
        if (url.includes('runnersneed')) return null;
        return { html: '', title: 'Brooks Ghost 16 Mens' };
      },
    });
    expect(fetched).toHaveLength(3);
    expect(r?.url).toBe('https://www.wiggle.com/product/brooks-ghost-16');
  });
});

describe('searchRetailerPages', () => {
  it('walks every domain when accept keeps saying no, pausing between searches only with an injected sleep', async () => {
    const pauses: number[] = [];
    const seen: string[][] = [];
    const r = await searchRetailerPages(brooks, 'Ghost 16', pages => { seen.push(pages.map(p => p.domain)); return null; }, {
      findShopifyProductPages: noShopify, webSearch: async q => [result(`https://www.${q.split(' ')[0].slice(5)}/product/brooks-ghost-16`)],
      fetchPage: async () => ({ html: '', title: 'Brooks Ghost 16 Mens' }),
      sleep: async ms => { pauses.push(ms); },
    });
    expect(r).toBeNull();
    expect(seen).toEqual(RETAILER_DOMAINS.map(d => [d]));
    expect(pauses).toEqual(Array(RETAILER_DOMAINS.length - 1).fill(1100));
  });
  it('drops results off the searched domain and article-shaped URLs before fetching', async () => {
    const fetched: string[] = [];
    await searchRetailerPages(brooks, 'Ghost 16', () => 'stop', {
      findShopifyProductPages: noShopify, webSearch: async q => q.startsWith('site:sportsshoes.com') ? [
        result('https://www.ebay.co.uk/itm/brooks-ghost-16'),
        result('https://www.sportsshoes.com/blog/brooks-ghost-16-review'),
        result('https://www.sportsshoes.com/product/brooks-ghost-16'),
      ] : [],
      fetchPage: async url => { fetched.push(url); return { html: '', title: 'Brooks Ghost 16 Mens' }; },
    });
    expect(fetched).toEqual(['https://www.sportsshoes.com/product/brooks-ghost-16']);
  });
});

describe('per-brand retailers', () => {
  it('a brand with importers searches them first, then the UK list; the others get only the UK list', () => {
    expect(retailersFor(lining).map(r => r.domain)).toEqual(['kicksown.com', 'supwell.com', 'shopnings.com', 'chinasportshop.com', ...RETAILER_DOMAINS]);
    expect(retailersFor(lining)[0]).toEqual({ domain: 'kicksown.com', lookup: 'shopify' });
    expect(retailersFor(qiaodan)[0]).toEqual({ domain: 'qiaodan.asia', lookup: 'shopify' });
    expect(retailersFor(brooks)).toEqual(RETAILER_DOMAINS.map(domain => ({ domain, lookup: 'search' })));
    expect(Object.keys(RETAILERS_BY_BRAND).sort()).toEqual(['361°', 'Anta', 'Bmai', 'Do-Win', 'Dynafish', 'Kailas', 'Li-Ning', 'Peak', 'Qiaodan', 'Runsifly', 'Xtep']);
  });
  it('a Shopify importer uses the store lookup, not a search, then fetches and checks the page like any other', async () => {
    const queries: string[] = [];
    const lookups: string[] = [];
    const r = await findRetailerProductPage(lining, 'Feidian 6 Elite', {
      findShopifyProductPages: async (domain, brand, model) => { lookups.push(`${domain} ${brand.name} ${model}`); return [{ url: 'https://kicksown.com/products/lining-feidian-6-elite-black', title: "LiNing Feidian 6 ELITE 'Black'" }]; },
      webSearch: async q => { queries.push(q); return []; },
      fetchPage: async () => ({ html: jsonld('LiNing Feidian 6 ELITE', 'https://c/f6.jpg'), title: "LiNing Feidian 6 ELITE 'Black' | Running Shoes" }),
    });
    expect(lookups).toEqual(['kicksown.com Li-Ning Feidian 6 Elite']);
    expect(queries).toEqual([]);
    expect(r).toMatchObject({ url: 'https://kicksown.com/products/lining-feidian-6-elite-black', source: 'retailer' });
    expect(r?.product?.image).toEqual(['https://c/f6.jpg']);
  });
  it('a Shopify page whose fetched title names a variant is still rejected', async () => {
    const r = await findRetailerProductPage(lining, 'Feidian 6 Elite', {
      findShopifyProductPages: async () => [{ url: 'https://kicksown.com/products/lining-feidian-6-elite-black', title: 'Feidian 6 Elite' }],
      webSearch: noResults,
      fetchPage: async () => ({ html: '', title: 'LiNing Feidian 6 ELITE ST | Running Shoes' }),
    });
    expect(r).toBeNull();
  });
  it('quotes only the model on a search importer, where the brand is spelt differently, and finds the page by the model', async () => {
    const queries: string[] = [];
    const r = await findRetailerProductPage(lining, 'Feidian 6 Elite', {
      findShopifyProductPages: noResults,
      webSearch: async q => { queries.push(q); return q.startsWith('site:supwell.com') ? [result('https://www.supwell.com/shoes/lining-feidian-6-elite')] : []; },
      fetchPage: async () => ({ html: jsonld('LiNing Feidian 6 ELITE', 'https://c/f6.jpg'), title: 'Li Ning Feidian 6 Elite | Supwell' }),
    });
    expect(queries[0]).toBe('site:supwell.com Li-Ning "Feidian 6 Elite"');
    expect(r).toMatchObject({ url: 'https://www.supwell.com/shoes/lining-feidian-6-elite', source: 'retailer' });
  });
  it('falls through to the UK retailers, quoting brand and model, when no importer has the page; pauses only between searches', async () => {
    const queries: string[] = [];
    const pauses: number[] = [];
    await findRetailerProductPage(lining, 'Feidian 6 Elite', {
      findShopifyProductPages: noResults,
      webSearch: async q => { queries.push(q); return []; },
      fetchPage: async () => null,
      sleep: async ms => { pauses.push(ms); },
    });
    expect(queries).toHaveLength(3 + RETAILER_DOMAINS.length);
    expect(queries[3]).toBe('site:sportsshoes.com "Li-Ning Feidian 6 Elite"');
    expect(pauses).toHaveLength(queries.length - 1);
  });
});

describe('findShopifyProductPages', () => {
  const suggest = (products: { title: string; handle: string }[]) => ({ resources: { results: { products: products.map(p => ({ ...p, url: `/products/${p.handle}?_pos=1&_psq=x`, image: 'https://cdn.shopify.com/x.jpg', available: true })) } } });
  const fetchJson = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  it('asks the store for the model and keeps only products naming the exact model', async () => {
    let url = '';
    const r = await findShopifyProductPages('kicksown.com', lining, 'Feidian Ultra', {
      fetch: async input => { url = String(input); return fetchJson(suggest([
        { title: "LiNing Feidian 5 Ultra 'Purple' | Running Shoes", handle: 'lining-feidian-5-ultra-purple' },
        { title: "LiNing Feidian Ultra 'Black' | Running Shoes", handle: 'lining-feidian-ultra-black' },
        { title: "LiNing Feidian 6 ULTRA 'Miro'", handle: 'lining-feidian-6-ultra-miro' },
      ]))(); },
    });
    expect(url).toBe('https://kicksown.com/search/suggest.json?q=Feidian%20Ultra&resources%5Btype%5D=product&resources%5Blimit%5D=10');
    expect(r).toEqual([{ url: 'https://kicksown.com/products/lining-feidian-ultra-black', title: "LiNing Feidian Ultra 'Black' | Running Shoes" }]);
  });
  it('returns nothing on a non-200, a non-JSON body, or a reply without products', async () => {
    expect(await findShopifyProductPages('supwell.com', lining, 'Feidian Ultra', { fetch: fetchJson({}, 404) })).toEqual([]);
    expect(await findShopifyProductPages('supwell.com', lining, 'Feidian Ultra', { fetch: async () => new Response('<html>', { status: 200 }) })).toEqual([]);
    expect(await findShopifyProductPages('kicksown.com', lining, 'Feidian Ultra', { fetch: fetchJson({ resources: {} }) })).toEqual([]);
  });
});

describe('pageNamesExactModel on importer pages', () => {
  const title = "LiNing Feidian 6 ELITE 'Black' | Running Shoes";
  const url = 'https://kicksown.com/products/lining-feidian-6-elite-black';
  it('matches on the model regardless of how the brand is spelt', () => {
    expect(pageNamesExactModel('Feidian 6 Elite', url, title)).toBe(true);
    expect(pageNamesExactModel('Feidian 6 Elite', 'https://kicksown.com/p/1', title)).toBe(true);
    expect(pageNamesExactModel('Feidian 6 Elite', url, 'Running Shoes | Kicksown')).toBe(true);
  });
  it('does not match a sibling model or the previous version', () => {
    expect(pageNamesExactModel('Feidian 6 Elite', 'https://kicksown.com/products/lining-feidian-6-challenger', 'LiNing Feidian 6 Challenger | Running Shoes')).toBe(false);
    expect(pageNamesExactModel('Feidian 6 Elite', 'https://kicksown.com/products/lining-feidian-5-elite-white', "LiNing Feidian 5 ELITE 'White' | Running Shoes")).toBe(false);
  });
});
