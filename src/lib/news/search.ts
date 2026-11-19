import * as cheerio from 'cheerio';
import { errorCostUsd, searchWeb } from '@/lib/llm';
import { NEWS_CONFIG, NOT_NEWS_DOMAINS } from './config';
import { extractPage, fetchHtml } from './gather';
import { SORT_MODEL } from './models';
import type { Bundle, Candidate } from './types';

/** Kept as a filter even though the Claude search is told to block them: the OpenRouter backup isn't. */
const isSkipHost = (host: string) => NOT_NEWS_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));

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

// Claude's web search first, OpenRouter's (on SORT_MODEL) as the backup (llm.ts, 19 Nov 2026).
const liveDeps: CoverageDeps = { search: (q) => searchWeb(q, { blockedDomains: NOT_NEWS_DOMAINS, openRouterModel: SORT_MODEL }), fetchHtml };

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
  // Extra coverage is a nice-to-have: if the search can't run (no Claude key or it failed, and
  // OpenRouter down or switched off for the run), the story goes ahead on the sources it has, and
  // the run carries on. searchWeb logs which provider answered.
  let found: { urls: string[]; costUsd: number };
  try {
    found = await deps.search(`${b.headline} (${now.getUTCFullYear()})`);
  } catch (e) {
    console.warn(`search: skipped for "${b.headline}" (${(e as Error).message.split('\n')[0].slice(0, 200)}), going ahead without extra coverage`);
    // A Claude search that ran but found nothing usable was still billed: count it.
    return { items: [], costUsd: errorCostUsd(e) };
  }
  const { urls, costUsd } = found;
  const since = now.getTime() - NEWS_CONFIG.windowDays * 86_400_000;
  const items: Candidate[] = [];
  for (const url of urls) {
    if (items.length >= want) break;
    let host: string;
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { continue; }
    if (hosts.has(host) || isSkipHost(host)) continue;
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
