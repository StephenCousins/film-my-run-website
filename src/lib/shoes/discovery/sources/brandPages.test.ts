import { describe, it, expect } from 'vitest';
import { readBrandNewArrivals } from './brandPages';

const html = `<script type="application/ld+json">{"@type":"ItemList","itemListElement":[
 {"@type":"Product","name":"Clifton 10","url":"https://www.hoka.com/x/clifton-10","releaseDate":"2026-03-01","image":"https://cdn/a.jpg"},
 {"@type":"Product","name":"Bondi 9","url":"https://www.hoka.com/x/bondi-9","image":"https://cdn/b.jpg"}]}</script>`;

describe('readBrandNewArrivals', () => {
  it('nominates every Product on the listing with the brand attached', async () => {
    const r = await readBrandNewArrivals(
      { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: 'https://www.hoka.com/new' },
      { fetchPage: async () => ({ html, title: 'New' }) },
    );
    expect(r.nominations).toEqual([
      expect.objectContaining({ brandText: 'Hoka', modelText: 'Clifton 10', url: 'https://www.hoka.com/x/clifton-10', source: 'brand:Hoka' }),
      expect.objectContaining({ brandText: 'Hoka', modelText: 'Bondi 9', publishedAt: null }),
    ]);
    expect(r.nominations[0].publishedAt).toEqual(new Date('2026-03-01'));
    expect(r.empty).toBe(false);
  });
  it('returns empty without error when the brand has no listing URL', async () => {
    const r = await readBrandNewArrivals({ id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: null }, { fetchPage: async () => null });
    expect(r).toMatchObject({ empty: true, nominations: [] });
    expect(r.error).toBeUndefined();
  });
  it('reports unreachable when the page cannot be fetched', async () => {
    const r = await readBrandNewArrivals(
      { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: 'https://www.hoka.com/new' },
      { fetchPage: async () => null },
    );
    expect(r).toMatchObject({ source: 'brand:Hoka', empty: true, nominations: [], error: 'unreachable' });
  });
  it('is empty without error when the page has no Product JSON-LD', async () => {
    const r = await readBrandNewArrivals(
      { id: 1, name: 'Hoka', aliases: [], domain: 'hoka.com', newArrivalsUrl: 'https://www.hoka.com/new' },
      { fetchPage: async () => ({ html: '<html><body>nothing</body></html>', title: 'New' }) },
    );
    expect(r).toMatchObject({ empty: true, nominations: [] });
    expect(r.error).toBeUndefined();
  });
});
