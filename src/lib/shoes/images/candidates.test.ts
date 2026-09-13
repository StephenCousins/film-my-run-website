import { describe, it, expect } from 'vitest';
import { imageCandidates } from './candidates';
const brooks = { id: 1, name: 'Brooks', aliases: [], domain: 'brooksrunning.com', newArrivalsUrl: null };
const jsonld = (name: string, img: string) => `<script type="application/ld+json">{"@type":"Product","name":"${name}","image":"${img}"}</script>`;

describe('imageCandidates', () => {
  it('puts brand JSON-LD first, then brand og:image', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: { url: 'https://www.brooksrunning.com/ghost-16', title: 'Ghost 16', html: jsonld('Ghost 16', 'https://c/j.jpg') + '<meta property="og:image" content="https://c/og.jpg">', product: null, releaseDate: null, source: 'brand' as const } }, { webSearch: async () => [], fetchPage: async () => null });
    expect(r.map(c => [c.method, c.url])).toEqual([['brand-jsonld', 'https://c/j.jpg'], ['brand-og', 'https://c/og.jpg']]);
  });
  it('labels images from a retailer page standing in for the brand site as retailer images', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: { url: 'https://www.sportsshoes.com/product/brooks-ghost-16', title: 'Ghost 16', html: jsonld('Ghost 16', 'https://c/j.jpg') + '<meta property="og:image" content="https://c/og.jpg">', product: null, releaseDate: null, source: 'retailer' as const } }, { webSearch: async () => [], fetchPage: async () => null }, { phase: 'brand' });
    expect(r.map(c => [c.method, c.url])).toEqual([['retailer-jsonld', 'https://c/j.jpg'], ['retailer-og', 'https://c/og.jpg']]);
  });
  it('rejects a retailer page for a neighbouring version', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: null }, {
      webSearch: async () => [{ title: 'Brooks Ghost 15 Mens', url: 'https://sportsshoes.com/product/brooks-ghost-15', description: '' }],
      fetchPage: async () => ({ html: jsonld('Ghost 15', 'https://c/15.jpg'), title: 'Brooks Ghost 15 Mens' }),
    });
    expect(r).toEqual([]);
  });
  it('accepts a retailer page naming the exact model', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: null }, {
      webSearch: async () => [{ title: 'Brooks Ghost 16 Mens Running Shoes', url: 'https://sportsshoes.com/product/brooks-ghost-16-mens', description: '' }],
      fetchPage: async () => ({ html: jsonld('Ghost 16', 'https://c/16.jpg'), title: 'Brooks Ghost 16 Mens Running Shoes' }),
    });
    expect(r[0]).toMatchObject({ method: 'retailer-jsonld', url: 'https://c/16.jpg' });
  });
});

describe('imageCandidates: JSON-LD product selection', () => {
  const page = (html: string) => ({ url: 'https://www.brooksrunning.com/ghost-16', title: 'Ghost 16', html, product: null, releaseDate: null, source: 'brand' as const });
  const product = (name: string | null, img: string) => `{"@type":"Product",${name === null ? '' : `"name":"${name}",`}"image":"${img}"}`;
  const ld = (...items: string[]) => `<script type="application/ld+json">[${items.join(',')}]</script>`;
  const noSearch = { webSearch: async () => [], fetchPage: async () => null };

  it('takes only the products named for the exact model when a carousel is present', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(ld(product('Ghost 16', 'https://c/16.jpg'), product('Ghost 15', 'https://c/15.jpg'), product('Adrenaline GTS 23', 'https://c/agts.jpg'))) }, noSearch);
    expect(r.map(c => c.url)).toEqual(['https://c/16.jpg']);
  });
  it('takes an unversioned lone product but not a lone neighbour or successor', async () => {
    const lone = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(ld(product("Men's Ghost", 'https://c/lone.jpg'))) }, noSearch);
    expect(lone.map(c => c.url)).toEqual(['https://c/lone.jpg']);
    const neighbour = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(ld(product('Ghost 15', 'https://c/15.jpg'))) }, noSearch);
    expect(neighbour).toEqual([]);
    const successor = await imageCandidates({ brand: brooks, model: 'Glycerin Max', brandPage: page(ld(product('Glycerin Max 2', 'https://c/max2.jpg'))) }, noSearch);
    expect(successor).toEqual([]);
  });
  it('takes nothing from several unnamed-for-this-model products', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(ld(product(null, 'https://c/a.jpg'), product('Adrenaline GTS 23', 'https://c/b.jpg'))) }, noSearch);
    expect(r).toEqual([]);
  });
  it('resolves relative JSON-LD images against the page and drops non-http ones', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(ld(product('Ghost 16', '/img/16.jpg')) + '<script type="application/ld+json">{"@type":"Product","name":"Ghost 16","image":["//cdn.c/16b.jpg","data:image/png;base64,AAAA"]}</script>') }, noSearch);
    expect(r.map(c => c.url)).toEqual(['https://www.brooksrunning.com/img/16.jpg', 'https://cdn.c/16b.jpg']);
  });
  it('dedupes a URL that is both JSON-LD and og:image, keeping the JSON-LD slot', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(ld(product('Ghost 16', 'https://c/16.jpg')) + '<meta property="og:image" content="https://c/16.jpg">') }, noSearch);
    expect(r).toEqual([{ url: 'https://c/16.jpg', method: 'brand-jsonld', pageUrl: 'https://www.brooksrunning.com/ghost-16' }]);
  });
});

describe('imageCandidates: retailers', () => {
  const ghost16 = (img: string) => ({ html: jsonld('Ghost 16', img), title: 'Brooks Ghost 16 Mens' });
  it('stops at the first retailer domain that yields a candidate', async () => {
    const queries: string[] = [];
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: null }, {
      webSearch: async q => { queries.push(q); return q.includes('runnersneed') || q.includes('wiggle') ? [{ title: 'x', url: `https://www.${q.split(' ')[0].slice(5)}/product/brooks-ghost-16`, description: '' }] : []; },
      fetchPage: async url => ghost16(`https://c/${new URL(url).hostname}.jpg`),
    });
    expect(queries).toEqual(['site:sportsshoes.com "Brooks Ghost 16"', 'site:runnersneed.com "Brooks Ghost 16"']);
    expect(r.map(c => c.url)).toEqual(['https://c/www.runnersneed.com.jpg']);
  });
  it('ignores results that are not on the searched domain, article pages, and pages that fail to fetch', async () => {
    const fetched: string[] = [];
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: null }, {
      webSearch: async q => q.startsWith('site:sportsshoes.com') ? [
        { title: 'leak', url: 'https://www.ebay.co.uk/itm/brooks-ghost-16', description: '' },
        { title: 'article', url: 'https://www.sportsshoes.com/blog/brooks-ghost-16-review', description: '' },
        { title: 'dead', url: 'https://www.sportsshoes.com/product/brooks-ghost-16-dead', description: '' },
        { title: 'ok', url: 'https://www.sportsshoes.com/product/brooks-ghost-16', description: '' },
      ] : [],
      fetchPage: async url => { fetched.push(url); if (url.includes('dead')) throw new Error('unreachable:503'); return ghost16('https://c/ok.jpg'); },
    });
    expect(fetched).toEqual(['https://www.sportsshoes.com/product/brooks-ghost-16-dead', 'https://www.sportsshoes.com/product/brooks-ghost-16']);
    expect(r.map(c => [c.method, c.url, c.pageUrl])).toEqual([['retailer-jsonld', 'https://c/ok.jpg', 'https://www.sportsshoes.com/product/brooks-ghost-16']]);
  });
  it('judges the fetched title, not the search-result title', async () => {
    const r = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: null }, {
      webSearch: async q => q.startsWith('site:sportsshoes.com') ? [{ title: 'Brooks Ghost 16', url: 'https://www.sportsshoes.com/p/12345', description: '' }] : [],
      fetchPage: async () => ({ html: jsonld('Ghost 17', 'https://c/17.jpg'), title: 'Brooks Ghost 17 Mens' }),
    });
    expect(r).toEqual([]);
  });
  it('pauses between retailer searches only when a sleep is injected', async () => {
    const pauses: number[] = [];
    await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: null }, { webSearch: async () => [], fetchPage: async () => null, sleep: async ms => { pauses.push(ms); } });
    expect(pauses).toEqual(Array(7).fill(1100));
  });
});

describe('imageCandidates: lone product must be this line', () => {
  const page = (html: string) => ({ url: 'https://www.brooksrunning.com/ghost-16', title: 'Ghost 16', html, product: null, releaseDate: null, source: 'brand' as const });
  const noSearch = { webSearch: async () => [], fetchPage: async () => null };
  const lone = (name: string) => `<script type="application/ld+json">{"@type":"Product","name":"${name}","image":"https://c/x.jpg"}</script>`;
  it('rejects a lone product from another line and accepts one named for the model', async () => {
    expect(await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(lone('Adrenaline GTS 23')) }, noSearch)).toEqual([]);
    expect((await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(lone('Ghost 16')) }, noSearch)).map(c => c.url)).toEqual(['https://c/x.jpg']);
  });
  it('splits by phase: brand never searches, retailer never reads the brand page', async () => {
    const queries: string[] = [];
    const deps = { webSearch: async (q: string) => { queries.push(q); return []; }, fetchPage: async () => null };
    const brand = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(lone('Ghost 16')) }, deps, { phase: 'brand' });
    expect(brand.map(c => c.method)).toEqual(['brand-jsonld']); expect(queries).toEqual([]);
    const retail = await imageCandidates({ brand: brooks, model: 'Ghost 16', brandPage: page(lone('Ghost 16')) }, deps, { phase: 'retailer' });
    expect(retail).toEqual([]); expect(queries).toHaveLength(8);
  });
});
