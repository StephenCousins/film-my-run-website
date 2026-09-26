import * as cheerio from 'cheerio';
import { searchWeb } from '@/lib/llm';
import { NEWS_CONFIG } from './config';
import { extractPage, fetchHtml } from './gather';
import { SORT_MODEL } from './models';
import type { Bundle, Candidate } from './types';

/** Not news reports, whatever a search says. */
const SKIP_HOSTS = /(^|\.)(youtube\.com|youtu\.be|facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com|strava\.com|reddit\.com|wikipedia\.org|linkedin\.com)$/;

/** When a page says it was published: meta tags, JSON-LD, then a <time>. Null when it doesn't say. */
export function publishedAt(html: string): Date | null {
  const $ = cheerio.load(html);
  const candidates = [
    $('meta[property="article:published_time"]').attr('content'),
    $('meta[property="og:published_time"]').attr('content'),
    $('meta[name="date"]').attr('content'),
    html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1],
    $('time[datetime]').first().attr('datetime'),
  ];
  for (const c of candidates) {
    const d = c ? new Date(c) : null;
    if (d && !isNaN(d.getTime())) return d;
  }
  return null;
}

export interface CoverageDeps {
  search: (query: string) => Promise<{ urls: string[]; costUsd: number }>;
  fetchHtml: (url: string) => Promise<string | null>;
}

const liveDeps: CoverageDeps = { search: (q) => searchWeb(SORT_MODEL, q), fetchHtml };

/**
 * Other sites' reports of a bundle's event, for when its own source can't be
 * read or stands alone (Stephen, 26 Sep 2026: "could it go looking elsewhere
 * for confirmation and more information?"). Only readable pages from other
 * sites that say they were published inside the news window count, so the
 * 14-day rule and the fact-check (which reads these too) still hold.
 * articleId 0: these are not feed items, so nothing marks them seen.
 */
export async function moreCoverage(b: Bundle, now: Date, deps: CoverageDeps = liveDeps, want = 3): Promise<{ items: Candidate[]; costUsd: number }> {
  const hosts = new Set(b.items.map((i) => new URL(i.url).hostname.replace(/^www\./, '')));
  const { urls, costUsd } = await deps.search(`${b.headline} (${now.getUTCFullYear()})`);
  const since = now.getTime() - NEWS_CONFIG.windowDays * 86_400_000;
  const items: Candidate[] = [];
  for (const url of urls) {
    if (items.length >= want) break;
    let host: string;
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { continue; }
    if (hosts.has(host) || SKIP_HOSTS.test(host)) continue;
    const html = await deps.fetchHtml(url);
    if (!html) continue;
    const when = publishedAt(html);
    if (!when || when.getTime() < since || when.getTime() > now.getTime() + 86_400_000) continue;
    const page = extractPage(html, url, host);
    if (!page.text) continue;
    const site = cheerio.load(html)('meta[property="og:site_name"]').attr('content')?.trim() || host;
    hosts.add(host);
    items.push({ articleId: 0, url, source: site, title: b.headline, pubDate: when, summary: '', text: page.text, imageUrl: page.imageUrl, photoCredit: page.photoCredit });
  }
  return { items, costUsd };
}
