import { describe, expect, it } from 'vitest';
import { moreCoverage, publishedAt } from './search';
import type { Bundle, Candidate } from './types';

const now = new Date('2026-09-26T06:00:00Z');
const cand = (url: string): Candidate => ({ articleId: 7, url, source: 'iRunFar', title: 'T', pubDate: now, summary: 's', text: null, imageUrl: null, photoCredit: null });
const bundle: Bundle = { key: 'gossage-pennine-way', headline: "Lucy Gossage sets women's supported FKT on the Pennine Way", items: [cand('https://www.irunfar.com/lucy-gossage')], verdicts: [], alreadyCovered: false };
const body = (date: string | null, site = 'Fell Runner') => `<html><head>${date ? `<meta property="article:published_time" content="${date}">` : ''}<meta property="og:site_name" content="${site}"></head><body><article>${'<p>Lucy Gossage ran the Pennine Way in a record time over three long days of hard running.</p>'.repeat(4)}</article></body></html>`;

describe('more coverage from the web', () => {
  it('keeps recent, readable reports from other sites and names them', async () => {
    const pages: Record<string, string> = {
      'https://fellrunner.test/gossage': body('2026-09-22T10:00:00Z'),
      'https://old.test/gossage-2019': body('2019-06-01T10:00:00Z'),
      'https://nodate.test/gossage': body(null),
      'https://www.youtube.com/watch?v=1': body('2026-09-22T10:00:00Z'),
      'https://www.irunfar.com/lucy-gossage': body('2026-09-22T10:00:00Z'),
    };
    const r = await moreCoverage(bundle, now, {
      search: async () => ({ urls: Object.keys(pages), costUsd: 0.02 }),
      fetchHtml: async (u: string) => pages[u] ?? null,
    });
    expect(r.items.map((i) => i.url)).toEqual(['https://fellrunner.test/gossage']);
    expect(r.items[0].source).toBe('Fell Runner');
    expect(r.items[0].articleId).toBe(0);
    expect(r.items[0].text).toContain('Pennine Way');
    expect(r.costUsd).toBe(0.02);
  });

  it('reads the date from meta, JSON-LD or a time tag', () => {
    expect(publishedAt('<meta property="article:published_time" content="2026-09-20T08:00:00Z">')?.toISOString()).toBe('2026-09-20T08:00:00.000Z');
    expect(publishedAt('<script type="application/ld+json">{"datePublished":"2026-09-21"}</script>')?.toISOString().slice(0, 10)).toBe('2026-09-21');
    expect(publishedAt('<time datetime="2026-09-19T12:00:00+01:00">19 Sep</time>')?.toISOString().slice(0, 10)).toBe('2026-09-19');
    expect(publishedAt('<p>no date</p>')).toBeNull();
  });
});
