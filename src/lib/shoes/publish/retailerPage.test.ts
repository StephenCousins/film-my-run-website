import { describe, it, expect } from 'vitest';
import { findRetailerProductPage, searchRetailerPages, RETAILER_DOMAINS } from './retailerPage';

const brooks = { id: 1, name: 'Brooks', aliases: [], domain: 'brooksrunning.com', newArrivalsUrl: null };
const jsonld = (name: string, img: string) => `<script type="application/ld+json">{"@type":"Product","name":"${name}","image":"${img}","releaseDate":"2026-03-01"}</script>`;
const result = (url: string) => ({ title: 'x', url, description: '' });

describe('findRetailerProductPage', () => {
  it('returns the first exact-model retailer page as a BrandPage sourced retailer, with its JSON-LD product', async () => {
    const queries: string[] = [];
    const r = await findRetailerProductPage(brooks, 'Ghost 16', {
      webSearch: async q => { queries.push(q); return q.startsWith('site:runnersneed.com') ? [result('https://www.runnersneed.com/p/brooks-ghost-16')] : []; },
      fetchPage: async () => ({ html: jsonld('Ghost 16', 'https://c/16.jpg'), title: 'Brooks Ghost 16 | Runners Need' }),
    });
    expect(queries).toEqual(['site:sportsshoes.com "Brooks Ghost 16"', 'site:runnersneed.com "Brooks Ghost 16"']);
    expect(r).toMatchObject({ url: 'https://www.runnersneed.com/p/brooks-ghost-16', title: 'Brooks Ghost 16 | Runners Need', source: 'retailer' });
    expect(r?.product?.image).toEqual(['https://c/16.jpg']);
    expect(r?.releaseDate?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });
  it('rejects a neighbouring version and returns null when no domain has the page', async () => {
    const r = await findRetailerProductPage(brooks, 'Ghost 16', {
      webSearch: async () => [result('https://www.sportsshoes.com/product/brooks-ghost-15')],
      fetchPage: async () => ({ html: '', title: 'Brooks Ghost 15 Mens' }),
    });
    expect(r).toBeNull();
  });
  it('skips a retailer that refuses the fetch and one whose page is gone, and carries on to the next', async () => {
    const fetched: string[] = [];
    const r = await findRetailerProductPage(brooks, 'Ghost 16', {
      webSearch: async q => [result(`https://www.${q.split(' ')[0].slice(5)}/product/brooks-ghost-16`)],
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
      webSearch: async q => [result(`https://www.${q.split(' ')[0].slice(5)}/product/brooks-ghost-16`)],
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
      webSearch: async q => q.startsWith('site:sportsshoes.com') ? [
        result('https://www.ebay.co.uk/itm/brooks-ghost-16'),
        result('https://www.sportsshoes.com/blog/brooks-ghost-16-review'),
        result('https://www.sportsshoes.com/product/brooks-ghost-16'),
      ] : [],
      fetchPage: async url => { fetched.push(url); return { html: '', title: 'Brooks Ghost 16 Mens' }; },
    });
    expect(fetched).toEqual(['https://www.sportsshoes.com/product/brooks-ghost-16']);
  });
});
