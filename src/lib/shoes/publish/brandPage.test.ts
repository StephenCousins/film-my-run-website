import { describe, it, expect } from 'vitest';
import { findBrandProductPage, pageNamesExactModel, type BrandPageDeps, type BrandPageResult } from './brandPage';

/** The page of a `found` result; fails the test on any other kind. */
const pageOf = (r: BrandPageResult) => { expect(r.kind).toBe('found'); return r.kind === 'found' ? r.page : null; };
const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };
const brooks = { id: 2, name: 'Brooks', aliases: [], domain: 'brooksrunning.com', newArrivalsUrl: null };
const noSleep = async () => {};
const noAdapter = async () => { throw new Error('no adapter expected for this brand'); };
const saucony = { id: 3, name: 'Saucony', aliases: [], domain: 'saucony.com', newArrivalsUrl: null };
const altra = { id: 4, name: 'Altra', aliases: [], domain: 'altrarunning.com', newArrivalsUrl: null };

describe('findBrandProductPage', () => {
  it('accepts a result whose URL contains the model slug', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Men\'s Clifton', url: 'https://www.hoka.com/en/gb/clifton-10/1.html', description: '' }],
      fetchPage: async () => ({ html: '<script type="application/ld+json">{"@type":"Product","name":"Clifton 10","image":"https://c/a.jpg","releaseDate":"2026-01-15"}</script>', title: "Men's Clifton" }),
      sleep: noSleep, findSitePages: noAdapter,
    });
    const p = pageOf(r);
    expect(p?.url).toContain('clifton-10');
    expect(p?.releaseDate?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(p?.product?.image).toEqual(['https://c/a.jpg']);
    expect(p?.source).toBe('brand');
  });
  it('rejects a neighbouring version', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Hoka Clifton 9', url: 'https://www.hoka.com/x/clifton-9/1.html', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Hoka Clifton 9' }),
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(r).toEqual({ kind: 'absent' });
  });
  it('accepts on title when the URL is opaque', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Clifton 10 | HOKA UK', url: 'https://www.hoka.com/p/1155141', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Clifton 10 | HOKA UK' }),
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(pageOf(r)?.url).toBe('https://www.hoka.com/p/1155141');
  });
  it('searches the brand domain for the quoted model and checks at most five results', async () => {
    const queries: string[] = [];
    const fetched: string[] = [];
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async (q, count) => {
        queries.push(q);
        expect(count).toBe(5);
        return Array.from({ length: 7 }, (_, i) => ({ title: `Page ${i}`, url: `https://www.hoka.com/p/${i}`, description: '' }));
      },
      fetchPage: async url => { fetched.push(url); return { html: '', title: 'Something else' }; },
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(queries).toEqual(['site:hoka.com "Clifton 10"']);
    expect(fetched).toHaveLength(5);
    expect(r).toEqual({ kind: 'absent' });
  });
  it('uses the fetched title, not the search-result title, and skips unfetchable pages', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [
        { title: 'Clifton 10 | HOKA UK', url: 'https://www.hoka.com/p/dead', description: '' },
        { title: 'Clifton 10 | HOKA UK', url: 'https://www.hoka.com/p/wrong', description: '' },
        { title: 'Nothing useful', url: 'https://www.hoka.com/p/right', description: '' },
      ],
      fetchPage: async url => {
        if (url.endsWith('dead')) return null;
        if (url.endsWith('wrong')) return { html: '', title: 'Clifton 9 | HOKA UK' };
        return { html: '', title: 'HOKA Clifton 10 Road Shoe' };
      },
      sleep: noSleep, findSitePages: noAdapter,
    });
    const p = pageOf(r);
    expect(p?.url).toBe('https://www.hoka.com/p/right');
    expect(p?.title).toBe('HOKA Clifton 10 Road Shoe');
    expect(p?.product).toBeNull();
    expect(p?.releaseDate).toBeNull();
  });
  it('rejects a later edition of an unversioned model, by title', async () => {
    const r = await findBrandProductPage(brooks, 'Glycerin Max', {
      webSearch: async () => [{ title: 'Glycerin Max 2', url: 'https://www.brooksrunning.com/p/000123', description: '' }],
      fetchPage: async () => ({ html: '', title: "Men's Glycerin Max 2 | Brooks Running" }),
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(r).toEqual({ kind: 'absent' });
  });
  it('rejects a later edition of an unversioned model, by URL', async () => {
    const r = await findBrandProductPage(brooks, 'Glycerin Max', {
      webSearch: async () => [{ title: 'Glycerin Max 2', url: 'https://www.brooksrunning.com/en_gb/glycerin-max-2/000123.html', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Brooks Running' }),
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(r).toEqual({ kind: 'absent' });
  });
  it('still accepts the unversioned model on its own page', async () => {
    const r = await findBrandProductPage(brooks, 'Glycerin Max', {
      webSearch: async () => [{ title: 'Glycerin Max', url: 'https://www.brooksrunning.com/p/000122', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Brooks Glycerin Max | Brooks Running' }),
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(pageOf(r)?.url).toBe('https://www.brooksrunning.com/p/000122');
    const byUrl = await findBrandProductPage(brooks, 'Glycerin Max', {
      webSearch: async () => [{ title: 'x', url: 'https://www.brooksrunning.com/en_gb/glycerin-max/000122.html', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Brooks Running' }),
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(pageOf(byUrl)?.url).toContain('glycerin-max/000122');
  });
  it('ignores an unparseable JSON-LD releaseDate', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'x', url: 'https://www.hoka.com/clifton-10', description: '' }],
      fetchPage: async () => ({ html: '<script type="application/ld+json">{"@type":"Product","name":"Clifton 10","releaseDate":"soon"}</script>', title: 'x' }),
      sleep: noSleep, findSitePages: noAdapter,
    });
    const p = pageOf(r);
    expect(p?.releaseDate).toBeNull();
    expect(p?.product?.name).toBe('Clifton 10');
  });
  it('is unreachable when every fetch is refused, carrying the first refusal', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [
        { title: 'a', url: 'https://www.hoka.com/clifton-10/a', description: '' },
        { title: 'b', url: 'https://www.hoka.com/clifton-10/b', description: '' },
      ],
      fetchPage: async url => { throw new Error(url.endsWith('a') ? 'unreachable:406' : 'unreachable:timeout'); },
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(r).toEqual({ kind: 'unreachable', reason: 'unreachable:406' });
  });
  it('is absent, not unreachable, when one page was fetched and none matched or the page is gone', async () => {
    const mixed = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [
        { title: 'a', url: 'https://www.hoka.com/p/a', description: '' },
        { title: 'b', url: 'https://www.hoka.com/p/b', description: '' },
      ],
      fetchPage: async url => { if (url.endsWith('a')) throw new Error('unreachable:403'); return { html: '', title: 'Clifton 9' }; },
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(mixed).toEqual({ kind: 'absent' });
    const gone = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'a', url: 'https://www.hoka.com/clifton-10', description: '' }],
      fetchPage: async () => null,
      sleep: noSleep, findSitePages: noAdapter,
    });
    expect(gone).toEqual({ kind: 'absent' });
    const noResults = await findBrandProductPage(hoka, 'Clifton 10', { webSearch: async () => [], fetchPage: async () => { throw new Error('unreachable:403'); }, sleep: noSleep, findSitePages: noAdapter });
    expect(noResults).toEqual({ kind: 'absent' });
  });
});

describe('pageNamesExactModel', () => {
  it('does not let a single-digit version match the URL of a two-digit one', async () => {
    const { pageNamesExactModel } = await import('./brandPage');
    expect(pageNamesExactModel('Clifton 1', 'https://www.hoka.com/clifton-10/1.html', 'Clifton 10 | HOKA')).toBe(false);
    expect(pageNamesExactModel('Clifton 10', 'https://www.hoka.com/clifton-10/1.html', 'Clifton 10 | HOKA')).toBe(true);
    expect(pageNamesExactModel('Ghost 16', 'https://sportsshoes.com/product/brooks-ghost-16-mens', 'Brooks Ghost 16 Mens')).toBe(true);
    expect(pageNamesExactModel('Ghost 16', 'https://sportsshoes.com/product/brooks-ghost-16-2', 'Brooks')).toBe(false);
  });
});

describe('pageNamesExactModel: variant words', () => {
  const p = pageNamesExactModel;
  it('rejects a variant word after the model, in the title or the URL slug', () => {
    expect(p('Miro Nude', 'https://kicksown.com/p/1', '361° Miro Nude ST | Running Shoes')).toBe(false);
    expect(p('Miro Nude', 'https://kicksown.com/products/miro-nude-st', 'Running Shoes | Kicksown')).toBe(false);
    expect(p('Miro Nude', 'https://kicksown.com/products/miro-nude-st', '361° Miro Nude | Running Shoes')).toBe(false);
    expect(p('Clifton 10', 'https://www.hoka.com/p/1', 'Clifton 10 GTX | HOKA UK')).toBe(false);
    expect(p('Clifton 10', 'https://www.hoka.com/clifton-10-gtx/1.html', "Men's Clifton")).toBe(false);
  });
  it('still accepts the plain model, and a variant word that is part of the model', () => {
    expect(p('Miro Nude', 'https://kicksown.com/p/1', '361° Miro Nude | Running Shoes')).toBe(true);
    expect(p('Miro Nude', 'https://kicksown.com/products/361-miro-nude-black', '361 Miro Nude Black')).toBe(true);
    expect(p('Feidian 6 Elite', 'https://kicksown.com/products/lining-feidian-6-elite-black', "LiNing Feidian 6 ELITE 'Black' | Running Shoes")).toBe(true);
    expect(p('Clifton 10', 'https://www.hoka.com/p/1', 'Clifton 10 | HOKA UK')).toBe(true);
  });
});

describe('findBrandProductPage with a storefront adapter', () => {
  it('asks the storefront first and spends no search when it names the page', async () => {
    const queries: string[] = [];
    const asked: string[] = [];
    const r = await findBrandProductPage(saucony, 'Endorphin Elite 3', {
      findSitePages: async (adapter, brand, model) => { asked.push(`${adapter.kind} ${brand} ${model}`); return [{ url: 'https://www.saucony.com/UK/en_GB/endorphin-elite-3/61243U.html', title: 'Endorphin Elite 3' }]; },
      webSearch: async q => { queries.push(q); return []; },
      fetchPage: async () => ({ html: '', title: 'Endorphin Elite 3 | Saucony UK' }),
      sleep: noSleep,
    });
    expect(asked).toEqual(['html-search Saucony Endorphin Elite 3']);
    expect(queries).toEqual([]);
    expect(pageOf(r)).toMatchObject({ url: 'https://www.saucony.com/UK/en_GB/endorphin-elite-3/61243U.html', source: 'brand' });
  });
  it('falls back to the search when the storefront names nothing, or refuses, or its page turns out to be another version', async () => {
    const queries: string[] = [];
    const deps = (findSitePages: BrandPageDeps['findSitePages'], fetchPage: BrandPageDeps['fetchPage']): BrandPageDeps => ({
      findSitePages, fetchPage, sleep: noSleep,
      webSearch: async q => { queries.push(q); return [{ title: 'x', url: 'https://www.altrarunning.com/en-us/products/mens-vanish-pulse', description: '' }]; },
    });
    const ok = async () => ({ html: '', title: "Men's Vanish Pulse | Altra" });
    expect(pageOf(await findBrandProductPage(altra, 'Vanish Pulse', deps(async () => [], ok)))?.url).toContain('mens-vanish-pulse');
    expect(pageOf(await findBrandProductPage(altra, 'Vanish Pulse', deps(async () => { throw new Error('unreachable:403'); }, ok)))?.url).toContain('mens-vanish-pulse');
    const wrong = await findBrandProductPage(altra, 'Vanish Pulse', deps(
      async () => [{ url: 'https://www.altrarunning.com/en-us/products/x', title: 'Vanish Pulse' }],
      async url => ({ html: '', title: url.endsWith('/x') ? "Men's Vanish Carbon 3 | Altra" : "Men's Vanish Pulse | Altra" }),
    ));
    expect(pageOf(wrong)?.url).toContain('mens-vanish-pulse');
    expect(queries).toEqual(Array(3).fill('site:altrarunning.com "Vanish Pulse"'));
  });
  it('is unreachable when the storefront refused and the search results were all refused too', async () => {
    const r = await findBrandProductPage(altra, 'Vanish Pulse', {
      findSitePages: async () => { throw new Error('unreachable:503'); },
      webSearch: async () => [],
      fetchPage: async () => { throw new Error('unreachable:403'); },
      sleep: noSleep,
    });
    expect(r).toEqual({ kind: 'unreachable', reason: 'unreachable:503' });
  });
});

describe('pageNamesExactModel word boundaries', () => {
  it('does not match a model inside a longer word', () => {
    expect(pageNamesExactModel('Titan', 'https://startfitness.co.uk/products/garmin-enduro-3-dlc-titanium-gps-watch-black', 'Garmin Enduro 3 DLC Titanium GPS Watch - Black')).toBe(false);
    expect(pageNamesExactModel('Ride', 'https://x/products/saucony-rider-2', 'Saucony Rider 2')).toBe(false);
  });
  it('still matches the whole word', () => {
    expect(pageNamesExactModel('Titan', 'https://x/products/li-ning-titan-trail', 'Li-Ning Titan Trail Running Shoes')).toBe(true);
  });
});

describe('pageNamesExactModel refuses a title that continues into another product name', () => {
  it('rejects Mesa Verde, Cairn Evo and KD900X LD', () => {
    expect(pageNamesExactModel('Mesa', 'https://x/p/1', 'Lems Mesa Verde | Lems Shoes')).toBe(false);
    expect(pageNamesExactModel('Cairn', 'https://x/p/2', 'Cairn Evo 3D PRO Adventure Sandals')).toBe(false);
    expect(pageNamesExactModel('KD900X', 'https://x/p/3', 'Kiprun KD900X LD Review')).toBe(false);
  });
  it('accepts audience, category, colour and review words after the model', () => {
    expect(pageNamesExactModel('Clifton 10', 'https://x/p/4', "Hoka Clifton 10 Mens Running Shoes - White")).toBe(true);
    expect(pageNamesExactModel('Endorphin Elite 3', 'https://x/p/5', 'Endorphin Elite 3 - Unisex | Saucony')).toBe(true);
    expect(pageNamesExactModel('Clifton 10', 'https://x/p/6', 'HOKA Clifton 10 Review - RTINGS.com')).toBe(true);
    expect(pageNamesExactModel('Feidian 6 Elite', 'https://x/p/7', "LiNing Feidian 6 ELITE 'Black' | Running Shoes")).toBe(true);
  });
});
