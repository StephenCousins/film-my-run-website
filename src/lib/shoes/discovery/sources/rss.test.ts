import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readFeed, readAllFeeds, titleLooksLikeShoe, FEEDS } from './rss';

const fx = (n: string) => readFileSync(join(__dirname, '__fixtures__', n), 'utf8');

describe('titleLooksLikeShoe', () => {
  it('accepts review titles with a version number', () => {
    expect(titleLooksLikeShoe('Hoka Clifton 10 Review')).toBe(true);
    expect(titleLooksLikeShoe('New Balance 1080 v14 First Look')).toBe(true);
  });
  it('rejects general articles', () => {
    expect(titleLooksLikeShoe('How to pace a marathon')).toBe(false);
  });
});

describe('readFeed', () => {
  it('turns feed items into nominations', async () => {
    const r = await readFeed({ key: 'running_shoes_guru', url: 'x' }, { fetchText: async () => fx('runningshoesguru.xml') });
    expect(r.empty).toBe(false);
    expect(r.nominations.length).toBeGreaterThan(0);
    for (const n of r.nominations) {
      expect(n.source).toBe('running_shoes_guru');
      expect(n.url).toMatch(/^https?:/);
      expect(n.publishedAt).toBeInstanceOf(Date);
      expect(n.modelText).toBe(n.title);
    }
  });
  it('keeps shoe titles and drops non-shoe articles from The Run Testers', async () => {
    const r = await readFeed({ key: 'the_run_testers', url: 'x' }, { fetchText: async () => fx('theruntesters.xml') });
    const titles = r.nominations.map(n => n.title);
    expect(titles).toContain('Saucony Triumph 19 Review');
    expect(titles).not.toContain('London Marathon 2021 Race Test');
  });
  it('flags an empty or unreachable feed', async () => {
    const r = await readFeed({ key: 'x', url: 'x' }, { fetchText: async () => { throw new Error('403'); } });
    expect(r).toMatchObject({ empty: true, error: '403', nominations: [] });
  });
  it('yields publishedAt null for an unparseable date rather than an Invalid Date', async () => {
    const xml = '<rss version="2.0"><channel><title>t</title><item><title>Hoka Clifton 10 Review</title><link>https://x/c10</link><pubDate>not a date</pubDate></item></channel></rss>';
    const r = await readFeed({ key: 'x', url: 'x' }, { fetchText: async () => xml });
    expect(r.nominations).toHaveLength(1);
    expect(r.nominations[0].publishedAt).toBeNull();
  });
  it('is empty when every item is filtered out, even though the feed had items', async () => {
    const xml = '<rss version="2.0"><channel><title>t</title><item><title>How to pace a marathon</title><link>https://x/pace</link></item></channel></rss>';
    const r = await readFeed({ key: 'x', url: 'x' }, { fetchText: async () => xml });
    expect(r).toMatchObject({ empty: true, nominations: [] });
    expect(r.error).toBeUndefined();
  });
  it('flags a feed with no items as empty without an error', async () => {
    const r = await readFeed({ key: 'x', url: 'x' }, { fetchText: async () => '<rss version="2.0"><channel><title>t</title></channel></rss>' });
    expect(r).toMatchObject({ empty: true, nominations: [] });
    expect(r.error).toBeUndefined();
  });
});

describe('readAllFeeds', () => {
  it('reads every feed in FEEDS and reports one result per feed', async () => {
    const seen: string[] = [];
    const results = await readAllFeeds({ fetchText: async url => { seen.push(url); return fx('theruntesters.xml'); } });
    expect(results.map(r => r.source)).toEqual(FEEDS.map(f => f.key));
    expect(seen).toEqual(FEEDS.map(f => f.url));
  });
  it('RTINGS: only the running-shoe items of the all-category feed', async () => {
    const rtings = FEEDS.find(f => f.key === 'rtings')!;
    const r = await readFeed(rtings, { fetchText: async () => fx('rtings-latest.xml') });
    expect(r.empty).toBe(false);
    expect(r.nominations.map(n => n.url)).toEqual([
      'https://www.rtings.com/running-shoes/reviews/361/flame-5',
      'https://www.rtings.com/running-shoes/reviews/asics/hyper-speed-6',
      'https://www.rtings.com/running-shoes/reviews/diadora/corsa',
    ]);
    expect(r.nominations[0].title).toBe('361 Flame 5 Running Shoe Review');
  });
});
