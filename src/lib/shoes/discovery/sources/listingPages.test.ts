import { describe, it, expect } from 'vitest';
import { LISTING_PAGES, LISTING_TOP, nominationsFromListing, readListingPages } from './listingPages';

const ss = LISTING_PAGES.find(p => p.key === 'sportsshoes:hoka')!;
const nike = LISTING_PAGES.find(p => p.key === 'nike.com')!;
const a = (href: string) => `<a href="${href}">x</a>`;

describe('listing pages', () => {
  it('reads sportsshoes product slugs once each, in page order, branded, and skips weatherproof or city editions', () => {
    const html = [
      a('/product/hok2565/hoka-skyflow-men'), a('/product/hok2565/hoka-skyflow-men'),
      a('/product/hok3001/hoka-clifton-11-gore-tex-men'), a('/product/hok3002/hoka-mach-7-berlin-marathon-men'),
      a('/product/hok2921/hoka-cielo-x1-2'),
    ].join('');
    const n = nominationsFromListing(ss, html);
    expect(n.map(x => x.title)).toEqual(['hoka skyflow men', 'hoka cielo x1 2']);
    expect(n[0]).toMatchObject({ brandText: 'Hoka', source: 'sportsshoes:hoka', url: 'https://www.sportsshoes.com/product/hok2565/hoka-skyflow-men', publishedAt: null });
  });
  it('drops season codes and Nike\'s retired prefixes, and skips spikes and gym shoes', () => {
    const html = [a('/product/nik1/nike-zoomx-streakfly-2-running-shoes---ho26'), a('/product/nik2/nike-air-zoom-alphafly-next%25-3-men'), a('/product/pum1/puma-evospeed-elite-2'), a('/product/pum2/puma-x-hyrox-deviate-nitro-4')].join('');
    expect(nominationsFromListing(ss, html).map(x => x.title)).toEqual(['nike streakfly 2 running shoes', 'nike alphafly 3 men']);
  });
  it('reads nike.com product slugs into full URLs', () => {
    const n = nominationsFromListing(nike, a('https://www.nike.com/gb/t/alphafly-4-mens-road-racing-shoes-n/ABC123'));
    expect(n).toEqual([expect.objectContaining({ brandText: 'Nike', title: 'alphafly 4 mens road racing shoes n', url: 'https://www.nike.com/gb/t/alphafly-4-mens-road-racing-shoes-n' })]);
  });
  it(`stops after the newest ${LISTING_TOP} products`, () => {
    const html = Array.from({ length: LISTING_TOP + 10 }, (_, i) => a(`/product/hok${i}/hoka-shoe-${i}-men`)).join('');
    expect(nominationsFromListing(ss, html)).toHaveLength(LISTING_TOP);
  });
  it('a refused page costs only itself and is named with its error', async () => {
    const r = await readListingPages({ fetch: async (u) => (String(u).includes('nike.com') ? new Response('', { status: 403 }) : new Response(a('/product/x1/brand-shoe-2-men'), { status: 200 })) });
    expect(r.stores?.find(s => s.store === 'nike.com')).toMatchObject({ nominated: 0, error: expect.stringContaining('403') });
    expect(r.nominations.length).toBe(LISTING_PAGES.length - 1);
  });
});
