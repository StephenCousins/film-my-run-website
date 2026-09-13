import { describe, it, expect } from 'vitest';
import { fetchReviewsForShoe, type ReviewDeps } from './reviews';
import type { SearchResult } from './search';

const r = (url: string, title: string, description: string): SearchResult => ({ url, title, description });

/** Answers the two prompts the module sends: YES/NO for "is this the shoe", a number for "score this snippet". */
const llm = (verify: string, score: string): ReviewDeps['completeText'] => async ({ prompt }) =>
  (prompt.includes('Reply: YES or NO') ? verify : score);

const depsWith = (results: SearchResult[], completeText = llm('YES clearly this shoe', '8.0')): ReviewDeps => ({
  webSearch: async () => results,
  completeText,
});

describe('fetchReviewsForShoe', () => {
  it('keeps one review per source, with the explicit score and a tag-stripped summary', async () => {
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, depsWith([
      r('https://runrepeat.com/hoka-clifton-10', 'Hoka Clifton 10 Review', 'Score: 8.7. Our lab tests found a soft, rockered ride.'),
      r('https://runrepeat.com/hoka-clifton-10-mens', 'Hoka Clifton 10 (men)', 'Score: 9.1. Duplicate source, must be dropped.'),
      r('https://blog.example.com/hoka-clifton-10-review', 'Hoka Clifton 10 review', '<b>4.5 stars</b> — a <em>great</em> daily trainer with plenty of cushion for easy miles.'),
      r('https://another.example.com/hoka-clifton-10', 'Hoka Clifton 10', 'Rated 5 stars by our testers. A second unknown site is still "other" and is dropped.'),
    ]));
    expect(reviews.map(v => [v.source, v.expert_score])).toEqual([['runrepeat', 8.7], ['other', 9]]);
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

  it('broadens the query twice when the first searches return nothing, pausing only with an injected sleep', async () => {
    const queries: string[] = [];
    const pauses: number[] = [];
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, {
      webSearch: async q => { queries.push(q); return queries.length === 3 ? [r('https://runrepeat.com/hoka-clifton-10', 'Hoka Clifton 10', 'Score: 8.0. Fine.')] : []; },
      completeText: llm('YES', '8.0'),
      sleep: async ms => { pauses.push(ms); },
    });
    expect(queries).toEqual(['"Hoka Clifton 10" running shoe review', 'Hoka Clifton 10 review', 'Clifton 10 running shoe review']);
    expect(pauses).toEqual([1100, 1100, 1100]);
    expect(reviews).toHaveLength(1);
  });

  it('treats an LLM failure as not verified and as no score, never as a pass', async () => {
    const reviews = await fetchReviewsForShoe('Hoka', 'Clifton 10', undefined, depsWith([
      r('https://www.irunfar.com/p/1', 'Clifton 10 Review', 'Score: 8.2. Off-slug URL, so verification is needed and it throws.'),
      r('https://runrepeat.com/hoka-clifton-10', 'Hoka Clifton 10 Review', 'No explicit score here, only a long paragraph of praise for the ride and fit.'),
    ], async () => { throw new Error('402'); }));
    expect(reviews).toEqual([]);
  });
});
