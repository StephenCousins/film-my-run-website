import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { findPages, rtingsReviewUrl, type SiteAdapter } from './index';
import { fetchSiteText } from './fetch';
import { parseAnchors } from './htmlSearch';
import { BRAND_SITE_ADAPTERS, REVIEW_SITE_LOOKUPS } from './config';

const fx = (n: string) => readFileSync(join(__dirname, '__fixtures__', n), 'utf8');
const html = (body: string, status = 200) => async () => new Response(body, { status, headers: { 'Content-Type': 'text/html' } });
const adapterFor = (source: string): SiteAdapter => REVIEW_SITE_LOOKUPS.find(l => l.source === source)!.adapter;
/** Serves one fixture and records the URL asked for. */
const serve = (fixture: string) => {
  const urls: string[] = [];
  return { urls, deps: { fetch: async (input: RequestInfo | URL) => { urls.push(String(input)); return html(fx(fixture))(); } } };
};

describe('fetchSiteText', () => {
  it('returns the body on 200, null on 404/410, and throws unreachable otherwise', async () => {
    expect(await fetchSiteText('https://x', { fetch: html('<p>ok</p>') })).toBe('<p>ok</p>');
    expect(await fetchSiteText('https://x', { fetch: html('', 404) })).toBeNull();
    expect(await fetchSiteText('https://x', { fetch: html('', 410) })).toBeNull();
    await expect(fetchSiteText('https://x', { fetch: html('', 403) })).rejects.toThrow('unreachable:403');
    await expect(fetchSiteText('https://x', { fetch: html('', 429) })).rejects.toThrow('unreachable:429');
    await expect(fetchSiteText('https://x', { fetch: html('', 503) })).rejects.toThrow('unreachable:503');
    await expect(fetchSiteText('https://x', { fetch: async () => { throw new TypeError('fetch failed'); } })).rejects.toThrow('unreachable:network');
  });
  it('sends a Chrome user agent', async () => {
    let ua = '';
    await fetchSiteText('https://x', { fetch: async (_i, init) => { ua = String((init?.headers as Record<string, string>)['User-Agent']); return html('')(); } });
    expect(ua).toContain('Chrome/');
  });
});

describe('parseAnchors', () => {
  it('resolves relative hrefs, drops the query string, names a link from its text or attributes, and keeps the longest name per URL', () => {
    const page = `
      <a href="/shoe-reviews/hoka-clifton-10-review"><img src="x.jpg"></a>
      <h4><a href="/shoe-reviews/hoka-clifton-10-review"><strong>Hoka Clifton 10</strong> Review: Even More</a></h4>
      <a href="https://www.saucony.com/UK/en_GB/endorphin-elite-3/61243U.html?dwvar_61243U_color=S100981-1019" title="Endorphin Elite 3"></a>
      <a data-vars-ga-call-to-action="Tested: Hoka Clifton 10" href="/gear/a65172550/hoka-clifton-10-review/"><div></div></a>
      <a href="#top">Top</a><a href="javascript:void(0)">x</a><a href="mailto:a@b.c">mail</a>
    `;
    expect(parseAnchors(page, 'https://believeintherun.com/?s=x')).toEqual([
      { url: 'https://believeintherun.com/shoe-reviews/hoka-clifton-10-review', title: 'Hoka Clifton 10 Review: Even More' },
      { url: 'https://www.saucony.com/UK/en_GB/endorphin-elite-3/61243U.html', title: 'Endorphin Elite 3' },
      { url: 'https://believeintherun.com/gear/a65172550/hoka-clifton-10-review/', title: 'Tested: Hoka Clifton 10' },
    ]);
  });
});

describe('rtings-url adapter', () => {
  it('builds the review URL from the brand and model slugs', () => {
    expect(rtingsReviewUrl('Hoka', 'Clifton 10')).toBe('https://www.rtings.com/running-shoes/reviews/hoka/clifton-10');
    expect(rtingsReviewUrl('Li-Ning', 'Feidian 6 Elite')).toBe('https://www.rtings.com/running-shoes/reviews/li-ning/feidian-6-elite');
    expect(rtingsReviewUrl('361°', 'Flame 5')).toBe('https://www.rtings.com/running-shoes/reviews/361/flame-5');
  });
  it('returns the page with its title on a 200 whose title names the model', async () => {
    const { urls, deps } = serve('rtings-clifton-10.html');
    const pages = await findPages({ kind: 'rtings-url' }, 'Hoka', 'Clifton 10', deps);
    expect(urls).toEqual(['https://www.rtings.com/running-shoes/reviews/hoka/clifton-10']);
    expect(pages).toEqual([{ url: 'https://www.rtings.com/running-shoes/reviews/hoka/clifton-10', title: 'HOKA Clifton 10 Review - RTINGS.com' }]);
  });
  it('returns nothing on a 404, and nothing when the page is a neighbouring version', async () => {
    expect(await findPages({ kind: 'rtings-url' }, 'Hoka', 'Clifton 99', { fetch: html(fx('rtings-404.html'), 404) })).toEqual([]);
    // A 200 whose <title> is the Clifton 11's (a redirect, or a wrong slug) must not stand in for the Clifton 10.
    expect(await findPages({ kind: 'rtings-url' }, 'Hoka', 'Clifton 10', { fetch: html('<title>HOKA Clifton 11 Review - RTINGS.com</title>') })).toEqual([]);
  });
  it('propagates a refusal', async () => {
    await expect(findPages({ kind: 'rtings-url' }, 'Hoka', 'Clifton 10', { fetch: html('', 403) })).rejects.toThrow('unreachable:403');
  });
});

describe('html-search adapter on the review sites', () => {
  it('Running Shoes Guru: the exact review, not the Clifton 9 beside it', async () => {
    const { urls, deps } = serve('runningshoesguru-search.html');
    const pages = await findPages(adapterFor('running_shoes_guru'), 'Hoka', 'Clifton 10', deps);
    expect(urls).toEqual(['https://www.runningshoesguru.com/?s=Hoka%20Clifton%2010']);
    expect(pages).toEqual([{ url: 'https://www.runningshoesguru.com/reviews/road/hoka-clifton-10-review/', title: 'HOKA Clifton 10 Review' }]);
  });
  it('Doctors of Running: the Clifton 10 review, not the Clifton Pro or the Stinson 8', async () => {
    const pages = await findPages(adapterFor('doctors_of_running'), 'Hoka', 'Clifton 10', serve('doctorsofrunning-search.html').deps);
    expect(pages).toEqual([{ url: 'https://www.doctorsofrunning.com/hoka-clifton-10-review-2025/', title: 'Hoka Clifton 10 Review (2025)' }]);
  });
  it('iRunFar: the review, not the Rocket X 3 beside it', async () => {
    const pages = await findPages(adapterFor('irunfar'), 'Hoka', 'Clifton 10', serve('irunfar-search.html').deps);
    expect(pages).toEqual([{ url: 'https://www.irunfar.com/hoka-clifton-10-review', title: 'Hoka Clifton 10 Review' }]);
  });
  it('Believe in the Run: the review under /shoe-reviews/, not the weekly roundup or the video that name the shoe', async () => {
    const pages = await findPages(adapterFor('believe_in_run'), 'Hoka', 'Clifton 10', serve('believeintherun-search.html').deps);
    expect(pages).toEqual([{ url: 'https://believeintherun.com/shoe-reviews/hoka-clifton-10-review', title: 'Hoka Clifton 10 Review: Even More of the Comfort We Love' }]);
  });
  it('The Run Testers: the review, not the Arahi 8 or the MagMax Nitro 2', async () => {
    const pages = await findPages(adapterFor('the_run_testers'), 'Hoka', 'Clifton 10', serve('theruntesters-search.html').deps);
    expect(pages).toEqual([{ url: 'https://theruntesters.com/hoka-clifton-10-review/', title: 'Hoka Clifton 10 Review' }]);
  });
  it("Runner's World: the /gear/ cards, named from their call-to-action attribute (the card text is the byline), not the best-of roundups", async () => {
    const pages = await findPages(adapterFor('runners_world'), 'Hoka', 'Clifton 10', serve('runnersworld-search.html').deps);
    expect(pages).toEqual([
      { url: 'https://www.runnersworld.com/gear/a65172550/hoka-clifton-10-review/', title: 'Tested: Hoka Clifton 10' },
      { url: 'https://www.runnersworld.com/gear/a71373815/hoka-clifton-10-walking-shoe-review/', title: 'Hoka Clifton 10 Walking Shoe Review' },
    ]);
  });
  it('returns nothing on a 404 search page and propagates a refusal', async () => {
    expect(await findPages(adapterFor('irunfar'), 'Hoka', 'Clifton 10', { fetch: html('', 404) })).toEqual([]);
    await expect(findPages(adapterFor('the_run_testers'), 'Hoka', 'Clifton 10', { fetch: html('', 429) })).rejects.toThrow('unreachable:429');
  });
});

describe('html-search adapter on the brand storefronts', () => {
  it('Saucony: one product URL for the Endorphin Elite 3 with the colourway query stripped, not the Elite 2 or the Pro 5', async () => {
    const { urls, deps } = serve('saucony-search.html');
    const pages = await findPages(BRAND_SITE_ADAPTERS.Saucony, 'Saucony', 'Endorphin Elite 3', deps);
    expect(urls).toEqual(['https://www.saucony.com/UK/en_GB/search?q=Endorphin%20Elite%203']);
    expect(pages).toEqual([{ url: 'https://www.saucony.com/UK/en_GB/endorphin-elite-3/61243U.html', title: 'Endorphin Elite 3' }]);
  });
  it('Nike: the Vomero 18 product pages, not the Gore-Tex variant or the Pegasus', async () => {
    const pages = await findPages(BRAND_SITE_ADAPTERS.Nike, 'Nike', 'Vomero 18', serve('nike-search.html').deps);
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      expect(p.url).toMatch(/nike\.com\/gb\/t\/vomero-18-/);
      expect(p.url).not.toContain('gore-tex');
      expect(p.title).toBe('Nike Vomero 18');
    }
  });
});

describe('shopify adapter', () => {
  it('Altra (locale-prefixed store): the Vanish Pulse, not the Vanish Carbon 2/3 or Vanish Tempo', async () => {
    const { urls, deps } = serve('altra-suggest-vanish-pulse.json');
    const pages = await findPages(BRAND_SITE_ADAPTERS.Altra, 'Altra', 'Vanish Pulse', deps);
    expect(urls[0]).toBe('https://www.altrarunning.com/en-us/search/suggest.json?q=Vanish%20Pulse&resources%5Btype%5D=product&resources%5Blimit%5D=10');
    expect(pages).toEqual([
      { url: 'https://www.altrarunning.com/en-us/products/mens-vanish-pulse-al0a85sj', title: "Men's Vanish Pulse" },
      { url: 'https://www.altrarunning.com/en-us/products/womens-vanish-pulse-al0a85up', title: "Women's Vanish Pulse" },
    ]);
  });
  it('Start Fitness: the Endorphin Elite 3 colourways, not the Elite 2', async () => {
    const pages = await findPages({ kind: 'shopify', store: 'startfitness.co.uk' }, 'Saucony', 'Endorphin Elite 3', serve('startfitness-suggest-endorphin-elite-3.json').deps);
    expect(pages.map(p => p.url)).toEqual([
      'https://startfitness.co.uk/products/saucony-endorphin-elite-3-running-shoes-white',
      'https://startfitness.co.uk/products/saucony-endorphin-elite-3-running-shoes-white-1',
      'https://startfitness.co.uk/products/saucony-endorphin-elite-3-running-shoes-red',
    ]);
  });
});
