import { describe, it, expect } from 'vitest';
import { findBrandProductPage } from './brandPage';
const hoka = { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null };
const brooks = { id: 2, name: 'Brooks', aliases: [], domain: 'brooksrunning.com', newArrivalsUrl: null };
const noSleep = async () => {};

describe('findBrandProductPage', () => {
  it('accepts a result whose URL contains the model slug', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Men\'s Clifton', url: 'https://www.hoka.com/en/gb/clifton-10/1.html', description: '' }],
      fetchPage: async () => ({ html: '<script type="application/ld+json">{"@type":"Product","name":"Clifton 10","image":"https://c/a.jpg","releaseDate":"2026-01-15"}</script>', title: "Men's Clifton" }),
      sleep: noSleep,
    });
    expect(r?.url).toContain('clifton-10');
    expect(r?.releaseDate?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(r?.product?.image).toEqual(['https://c/a.jpg']);
  });
  it('rejects a neighbouring version', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Hoka Clifton 9', url: 'https://www.hoka.com/x/clifton-9/1.html', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Hoka Clifton 9' }),
      sleep: noSleep,
    });
    expect(r).toBeNull();
  });
  it('accepts on title when the URL is opaque', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'Clifton 10 | HOKA UK', url: 'https://www.hoka.com/p/1155141', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Clifton 10 | HOKA UK' }),
      sleep: noSleep,
    });
    expect(r?.url).toBe('https://www.hoka.com/p/1155141');
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
      sleep: noSleep,
    });
    expect(queries).toEqual(['site:hoka.com "Clifton 10"']);
    expect(fetched).toHaveLength(5);
    expect(r).toBeNull();
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
      sleep: noSleep,
    });
    expect(r?.url).toBe('https://www.hoka.com/p/right');
    expect(r?.title).toBe('HOKA Clifton 10 Road Shoe');
    expect(r?.product).toBeNull();
    expect(r?.releaseDate).toBeNull();
  });
  it('rejects a later edition of an unversioned model, by title', async () => {
    const r = await findBrandProductPage(brooks, 'Glycerin Max', {
      webSearch: async () => [{ title: 'Glycerin Max 2', url: 'https://www.brooksrunning.com/p/000123', description: '' }],
      fetchPage: async () => ({ html: '', title: "Men's Glycerin Max 2 | Brooks Running" }),
      sleep: noSleep,
    });
    expect(r).toBeNull();
  });
  it('rejects a later edition of an unversioned model, by URL', async () => {
    const r = await findBrandProductPage(brooks, 'Glycerin Max', {
      webSearch: async () => [{ title: 'Glycerin Max 2', url: 'https://www.brooksrunning.com/en_gb/glycerin-max-2/000123.html', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Brooks Running' }),
      sleep: noSleep,
    });
    expect(r).toBeNull();
  });
  it('still accepts the unversioned model on its own page', async () => {
    const r = await findBrandProductPage(brooks, 'Glycerin Max', {
      webSearch: async () => [{ title: 'Glycerin Max', url: 'https://www.brooksrunning.com/p/000122', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Brooks Glycerin Max | Brooks Running' }),
      sleep: noSleep,
    });
    expect(r?.url).toBe('https://www.brooksrunning.com/p/000122');
    const byUrl = await findBrandProductPage(brooks, 'Glycerin Max', {
      webSearch: async () => [{ title: 'x', url: 'https://www.brooksrunning.com/en_gb/glycerin-max/000122.html', description: '' }],
      fetchPage: async () => ({ html: '', title: 'Brooks Running' }),
      sleep: noSleep,
    });
    expect(byUrl?.url).toContain('glycerin-max/000122');
  });
  it('ignores an unparseable JSON-LD releaseDate', async () => {
    const r = await findBrandProductPage(hoka, 'Clifton 10', {
      webSearch: async () => [{ title: 'x', url: 'https://www.hoka.com/clifton-10', description: '' }],
      fetchPage: async () => ({ html: '<script type="application/ld+json">{"@type":"Product","name":"Clifton 10","releaseDate":"soon"}</script>', title: 'x' }),
      sleep: noSleep,
    });
    expect(r?.releaseDate).toBeNull();
    expect(r?.product?.name).toBe('Clifton 10');
  });
});
