import { describe, expect, it, vi } from 'vitest';

// The live search, with both providers down: no network.
vi.mock('openai', () => ({ default: class { chat = { completions: { create: async () => { throw Object.assign(new Error('401 User not found.'), { status: 401 }); } } }; } }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { stream: () => ({ finalMessage: async () => { throw new Error('529 overloaded'); } }) }; } }));

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

describe('more coverage when the search is down', () => {
  it('skips extra coverage and carries on instead of failing the run', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchHtml = vi.fn(async () => null);
    const r = await moreCoverage(bundle, now, {
      search: async () => { throw Object.assign(new Error('401 User not found.'), { status: 401 }); },
      fetchHtml,
    });
    expect(r).toEqual({ items: [], costUsd: 0 });
    expect(fetchHtml).not.toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toMatch(/search: skipped .*User not found/);
    warn.mockRestore();
  });

  it('counts what a failed search still spent (a billed Claude search with only error results)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await moreCoverage(bundle, now, {
      search: async () => { throw Object.assign(new Error('every search provider failed. ...'), { costUsd: 0.021 }); },
      fetchHtml: vi.fn(async () => null),
    });
    expect(r).toEqual({ items: [], costUsd: 0.021 });
    warn.mockRestore();
  });

  it('the live search with the Claude key and OpenRouter both failing: no extra items, the story goes ahead', async () => {
    process.env.ANTHROPIC_CREDIT_API_KEY = 'c';
    process.env.OPENROUTER_API_KEY = 'k';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await moreCoverage(bundle, now);
    expect(r).toEqual({ items: [], costUsd: 0 });
    expect(warn.mock.calls.at(-1)![0]).toMatch(/search: skipped .*every search provider failed.*529 overloaded.*User not found/);
    warn.mockRestore();
    delete process.env.ANTHROPIC_CREDIT_API_KEY;
  });

  it('drops social and video sites, subdomains included, whatever the search returns', async () => {
    const fetchHtml = vi.fn(async () => body('2026-09-22T10:00:00Z'));
    const r = await moreCoverage(bundle, now, {
      search: async () => ({ urls: ['https://m.youtube.com/watch?v=1', 'https://en.wikipedia.org/wiki/Pennine_Way', 'https://x.com/a'], costUsd: 0 }),
      fetchHtml,
    });
    expect(r.items).toEqual([]);
    expect(fetchHtml).not.toHaveBeenCalled();
  });
});
