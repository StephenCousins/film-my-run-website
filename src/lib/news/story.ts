import * as cheerio from 'cheerio';
import { prisma } from '@/lib/db';
import { extractPage, fetchHtml } from './gather';
import type { RunDeps } from './run';
import { publishedAt } from './search';
import { sortItem } from './sort';
import type { Candidate, Verdict } from './types';

/**
 * A story on demand (Stephen, 27 Sep 2026: "there's a big news story here,
 * please write it and put it on the site now"). The links he gives go through
 * the daily run's own pipeline (write, fact-check, code rules, image,
 * publish) with the feed, the sort's pass mark and the grouping swapped out:
 * he has already decided it is news and that it is one event.
 */

export interface StoryPageDeps {
  fetchHtml: (url: string) => Promise<string | null>;
  /** The feed article for this link, if the feeds carried it: marks it seen so the daily run
   * won't write it again, and gives the site's proper name ("Athletics Weekly", not a hostname). */
  feedArticle: (url: string) => Promise<{ id: number; source: string } | null>;
}

const livePageDeps: StoryPageDeps = {
  fetchHtml,
  feedArticle: async (url) => prisma.articles.findFirst({ where: { link: url }, select: { id: true, source: true } }),
};

export async function storyCandidates(urls: string[], now: Date, deps: StoryPageDeps = livePageDeps): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const url of urls) {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const html = await deps.fetchHtml(url);
    const $ = html ? cheerio.load(html) : null;
    const page = html ? extractPage(html, url, host) : { text: null, imageUrl: null, photoCredit: null };
    const feed = await deps.feedArticle(url);
    out.push({
      articleId: feed?.id ?? 0,
      url,
      source: feed?.source || $?.('meta[property="og:site_name"]').attr('content')?.trim() || host,
      title: $?.('meta[property="og:title"]').attr('content')?.trim() || $?.('title').first().text().trim() || url,
      pubDate: (html && publishedAt(html)) || now,
      summary: $?.('meta[property="og:description"]').attr('content')?.trim() ?? '',
      text: page.text,
      imageUrl: page.imageUrl,
      photoCredit: page.photoCredit,
    });
  }
  return out;
}

/**
 * The run's deps for one hand-picked story: the links are the feed, every one
 * passes the sort (which still sets topic, UK and importance), and they make
 * one bundle, headed by the first page's title unless a headline is given.
 */
export function storyDeps(
  candidates: Candidate[],
  opts: { note?: string; headline?: string; sort?: RunDeps['sort'] } = {}
): Partial<RunDeps> {
  const sort = opts.sort ?? ((c: Candidate) => sortItem(c));
  return {
    gather: async () => candidates,
    sort: async (c) => {
      const r = await sort(c);
      const base: Verdict = r.verdict ?? { type: 'news', confidence: 1, isRunning: true, topic: 'road', isUk: false, importance: 7 };
      return { verdict: { ...base, type: 'news', confidence: 1, isRunning: true }, costUsd: r.costUsd };
    },
    group: async (items) => ({
      costUsd: 0,
      bundles: items.length
        ? [{
            key: `desk-${items[0].c.url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}`,
            headline: opts.headline || items[0].c.title,
            items: items.map((i) => i.c),
            verdicts: items.map((i) => i.v),
            alreadyCovered: false,
            onDemand: true,
            ...(opts.note ? { note: opts.note } : {}),
          }]
        : [],
    }),
  };
}
