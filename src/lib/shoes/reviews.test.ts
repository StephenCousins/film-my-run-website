import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchReviewsForShoe, type ReviewDeps } from './reviews';
import type { SearchResult } from './search';
import type { SiteAdapter } from './sitesearch';
import { extractArticleText, extractFirstParagraph, extractJsonLdReviewRating, extractMetaDescription } from './html';

const fx = (n: string) => readFileSync(join(__dirname, 'sitesearch', '__fixtures__', n), 'utf8');
const r = (url: string, title: string, description: string): SearchResult => ({ url, title, description });
const titleOf = (html: string) => html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1].trim() ?? '';

/** Answers the two prompts the module sends: YES/NO for "is this the shoe", a number for "score this snippet". */
const llm = (verify: string, score: string): ReviewDeps['completeText'] => async ({ prompt }) =>
  (prompt.includes('Reply: YES or NO') ? verify : score);

/** Every site answers with nothing, so only the search path runs. */
const noSites = { findSitePages: async () => [], fetchPage: async () => null };

const depsWith = (results: SearchResult[], completeText = llm('YES clearly this shoe', '8.0')): ReviewDeps => ({
  webSearch: async () => results,
  completeText,
  ...noSites,
});

/** The review sites' lookups, keyed by adapter kind or search host; pages are served from the fixtures. */
const sites: Record<string, { url: string; page: string }[]> = {
  rtings: [{ url: 'https://www.rtings.com/running-shoes/reviews/hoka/clifton-10', page: 'rtings-clifton-10.html' }],
  'www.runningshoesguru.com': [{ url: 'https://www.runningshoesguru.com/reviews/road/hoka-clifton-10-review/', page: 'runningshoesguru-clifton-10.html' }],
};
const siteDeps = (overrides: Partial<ReviewDeps> = {}): ReviewDeps => ({
  webSearch: async () => { throw new Error('search should not run'); },
  completeText: llm('YES', '8.4'),
  findSitePages: async (adapter: SiteAdapter) => {
    const key = adapter.kind === 'rtings-url' ? 'rtings' : adapter.kind === 'html-search' ? new URL(adapter.searchUrl).hostname : adapter.store;
    return (sites[key] ?? []).map(p => ({ url: p.url, title: titleOf(fx(p.page)) }));
  },
  fetchPage: async url => {
    const hit = Object.values(sites).flat().find(p => p.url === url);
    return hit ? { html: fx(hit.page), title: titleOf(fx(hit.page)) } : null;
  },
  ...overrides,
});

describe('review page readers', () => {
  it("reads RTINGS' JSON-LD review rating and the review's own description", () => {
    const html = fx('rtings-clifton-10.html');
    expect(extractJsonLdReviewRating(html)).toBe(8.1);
    expect(extractMetaDescription(html)).toMatch(/^The HOKA Clifton 10 revamps the legacy/);
    expect(extractArticleText(html)).toContain('Our Verdict');
    expect(extractArticleText(html)).not.toContain('nav junk');
  });
  it("reads Running Shoes Guru's expert rating (7.0), not the readers' aggregate (9.7)", () => {
    expect(extractJsonLdReviewRating(fx('runningshoesguru-clifton-10.html'))).toBe(7);
  });
  it('scales a rating by its bestRating and ignores a nonsense one', () => {
    expect(extractJsonLdReviewRating('<script type="application/ld+json">{"@type":"Review","reviewRating":{"ratingValue":"4","bestRating":"5"}}</script>')).toBe(8);
    expect(extractJsonLdReviewRating('<script type="application/ld+json">{"@type":"Review","reviewRating":{"ratingValue":"11","bestRating":"10"}}</script>')).toBeNull();
    expect(extractJsonLdReviewRating('<script type="application/ld+json">{"@type":"Product","aggregateRating":{"ratingValue":"9.7"}}</script>')).toBeNull();
  });
  it('takes the first substantial paragraph of the article', () => {
    const html = '<nav><p>A long enough navigation paragraph that must not be the summary at all.</p></nav><article><p>Short.</p><p>The <b>Clifton 10</b> is a soft daily trainer with a rockered ride and a roomy fit.</p></article>';
    expect(extractFirstParagraph(html)).toBe('The Clifton 10 is a soft daily trainer with a rockered ride and a roomy fit.');
  });
});

describe('fetchReviewsForShoe: the sites first', () => {
  it('takes the score from the review page itself and spends no search when two sites answer', async () => {
    const progress: string[] = [];
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', m => progress.push(m), siteDeps());
    expect(reviews.map(v => [v.source, v.expert_score, v.via])).toEqual([['other', 8.1, 'site'], ['running_shoes_guru', 7, 'site']]);
    expect(reviews[0].source_url).toBe('https://www.rtings.com/running-shoes/reviews/hoka/clifton-10');
    expect(reviews[0].summary).toMatch(/^The HOKA Clifton 10 revamps/);
    expect(reviews[0].summary!.length).toBeLessThanOrEqual(200);
    expect(progress).not.toContain('Searching for reviews...');
  });
  it('re-checks the fetched title: a site whose page turns out to be the Clifton 9 contributes nothing', async () => {
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, siteDeps({
      fetchPage: async url => (url.includes('rtings') ? { html: '<title>HOKA Clifton 9 Review - RTINGS.com</title>', title: 'HOKA Clifton 9 Review - RTINGS.com' } : null),
      webSearch: async () => [],
    }));
    expect(reviews).toEqual([]);
  });
  it('falls back to an explicit score in the page text, then to the LLM on the opening paragraphs; a page with no score is not a review', async () => {
    const prompts: string[] = [];
    const page = (body: string) => ({ html: `<title>Hoka Clifton 10 Review</title><article>${body}</article>`, title: 'Hoka Clifton 10 Review' });
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, siteDeps({
      findSitePages: async adapter => (adapter.kind === 'html-search' ? [{ url: `https://${new URL(adapter.searchUrl).hostname}/hoka-clifton-10-review`, title: 'Hoka Clifton 10 Review' }] : []),
      fetchPage: async url => {
        if (url.includes('irunfar')) return page('<p>We rate the Clifton 10 a solid 8/10 for easy days and long runs.</p>');
        if (url.includes('believeintherun')) return page(`<p>${'A long and thoughtful paragraph about the ride, fit and foam of the Clifton 10. '.repeat(3)}</p>`);
        if (url.includes('theruntesters')) return page('<p>Too short.</p>');
        return null;
      },
      completeText: async ({ prompt }) => { prompts.push(prompt); return '7.9'; },
      webSearch: async () => [],
    }));
    expect(reviews.map(v => [v.source, v.expert_score])).toEqual([['irunfar', 8], ['believe_in_run', 7.9]]);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('A long and thoughtful paragraph');
  });
  it('skips a site that refuses its search and carries on', async () => {
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, siteDeps({
      findSitePages: async (adapter, brand, model) => {
        if (adapter.kind === 'html-search' && adapter.searchUrl.includes('runnersworld')) throw new Error('unreachable:429');
        return siteDeps().findSitePages(adapter, brand, model);
      },
    }));
    expect(reviews).toHaveLength(2);
  });
  it('spends one search when the sites give fewer than two, and the search never repeats a source the sites found', async () => {
    const queries: string[] = [];
    const pauses: number[] = [];
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, siteDeps({
      findSitePages: async adapter => (adapter.kind === 'rtings-url' ? siteDeps().findSitePages(adapter, 'Hoka', 'Clifton 10') : []),
      webSearch: async q => { queries.push(q); return [
        r('https://www.rtings.com/running-shoes/reviews/hoka/clifton-10', 'HOKA Clifton 10 Review', 'Score: 9.9 — a duplicate of the site result, dropped as its source is taken.'),
        r('https://runrepeat.com/hoka-clifton-10', 'Hoka Clifton 10 Review', 'Score: 8.7. Our lab tests found a soft, rockered ride.'),
      ]; },
      sleep: async ms => { pauses.push(ms); },
    }));
    expect(queries).toEqual(['"Hoka Clifton 10" running shoe review']);
    expect(pauses).toEqual([1100]);
    expect(reviews.map(v => [v.source, v.expert_score, v.via])).toEqual([['other', 8.1, 'site'], ['runrepeat', 8.7, 'search']]);
  });
});

describe('fetchReviewsForShoe: the search fallback', () => {
  it('keeps one review per source, with the explicit score and a tag-stripped summary', async () => {
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, depsWith([
      r('https://runrepeat.com/hoka-clifton-10', 'Hoka Clifton 10 Review', 'Score: 8.7. Our lab tests found a soft, rockered ride.'),
      r('https://runrepeat.com/hoka-clifton-10-mens', 'Hoka Clifton 10 (men)', 'Score: 9.1. Duplicate source, must be dropped.'),
      r('https://blog.example.com/hoka-clifton-10-review', 'Hoka Clifton 10 review', '<b>4.5 stars</b> — a <em>great</em> daily trainer with plenty of cushion for easy miles.'),
      r('https://another.example.com/hoka-clifton-10', 'Hoka Clifton 10', 'Rated 5 stars by our testers. A second unknown site is still "other" and is dropped.'),
    ]));
    expect(reviews.map(v => [v.source, v.expert_score, v.via])).toEqual([['runrepeat', 8.7, 'search'], ['other', 9, 'search']]);
    expect(reviews[0].source_url).toBe('https://runrepeat.com/hoka-clifton-10');
    expect(reviews[1].summary).toBe('4.5 stars — a great daily trainer with plenty of cushion for easy miles.');
    expect(reviews[1].summary).not.toContain('<');
  });

  it('rejects a result whose title names a neighbouring version, and a result that never names the model', async () => {
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, depsWith([
      r('https://runrepeat.com/hoka-clifton-9', 'Hoka Clifton 9 Review', 'Score: 8.9. Lighter than the Clifton 10 that replaced it.'),
      r('https://www.irunfar.com/best-road-shoes', 'Best road shoes', 'Score: 9.0. A roundup that never mentions this model.'),
    ]));
    expect(reviews).toEqual([]);
  });

  it('asks the LLM about a comparison article or an off-slug URL, and drops it on NO', async () => {
    const asked: string[] = [];
    const no: ReviewDeps['completeText'] = async ({ prompt }) => { asked.push(prompt); return prompt.includes('Reply: YES or NO') ? 'NO it is the older shoe' : '8.0'; };
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, depsWith([
      r('https://www.runnersworld.com/clifton-10-vs-9', 'Hoka Clifton 10 vs Clifton 9', 'Score: 8.5. Which one should you buy?'),
      r('https://www.irunfar.com/p/12345', 'Clifton 10 Review', 'Score: 8.2. The URL does not carry the slug, so the LLM is asked.'),
    ], no));
    expect(reviews).toEqual([]);
    expect(asked).toHaveLength(2);
    expect(asked[0]).toContain('WATCH OUT for these different versions');
  });

  it('infers a score from the snippet when none is explicit, and skips a result with no score at all', async () => {
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, depsWith([
      r('https://www.irunfar.com/hoka-clifton-10-review', 'Hoka Clifton 10 Review', 'A supremely comfortable daily trainer that we happily ran a hundred miles in without complaint.'),
      r('https://believeintherun.com/hoka-clifton-10-review', 'Hoka Clifton 10 Review', 'Too short to score.'),
    ], llm('YES', '8.4')));
    expect(reviews.map(v => [v.source, v.expert_score])).toEqual([['irunfar', 8.4]]);
  });

  it('searches exactly once, whatever comes back, pausing only with an injected sleep', async () => {
    const queries: string[] = [];
    const pauses: number[] = [];
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, {
      webSearch: async q => { queries.push(q); return []; },
      completeText: llm('YES', '8.0'),
      sleep: async ms => { pauses.push(ms); },
      ...noSites,
    });
    expect(queries).toEqual(['"Hoka Clifton 10" running shoe review']);
    expect(pauses).toEqual([1100]);
    expect(reviews).toEqual([]);
  });

  it('treats an LLM failure as not verified and as no score, never as a pass', async () => {
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, depsWith([
      r('https://www.irunfar.com/p/1', 'Clifton 10 Review', 'Score: 8.2. Off-slug URL, so verification is needed and it throws.'),
      r('https://runrepeat.com/hoka-clifton-10', 'Hoka Clifton 10 Review', 'No explicit score here, only a long paragraph of praise for the ride and fit.'),
    ], async () => { throw new Error('402'); }));
    expect(reviews).toEqual([]);
  });
});
