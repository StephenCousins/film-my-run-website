import Parser from 'rss-parser';
import type { Nomination, SourceResult } from '../types';

// Not listed: road_trail_run (https://www.roadtrailrun.com/feeds/posts/default?alt=rss).
// Probed 13 September 2026 with this file's headers: HTTP 403, a Cloudflare
// "Just a moment..." JS challenge on every path and User-Agent tried
// (/feeds/posts/default, /rss.xml, /feed/, /sitemap.xml; Chrome, Googlebot,
// FeedFetcher-Google, none). A feed that fails every week trains the
// digest's "feeds that returned nothing" section to be skipped, which is
// where a real outage would show. Re-add once a direct fetch returns items.
export const FEEDS: { key: string; url: string }[] = [
  { key: 'running_shoes_guru', url: 'https://www.runningshoesguru.com/feed/' },
  { key: 'the_run_testers', url: 'https://theruntesters.com/feed/' },
  { key: 'runners_world', url: 'https://www.runnersworld.com/uk/rss/all.xml/' },
  { key: 'irunfar', url: 'https://www.irunfar.com/feed' },
  { key: 'believe_in_run', url: 'https://believeintherun.com/feed/' },
  { key: 'doctors_of_running', url: 'https://www.doctorsofrunning.com/feed/' },
];

// A shoe post nearly always carries a review word or a version number.
// Deliberately loose: the resolver downstream decides what is actually a shoe.
const SHOE_TITLE = /(review|first look|first run|preview|launch|tested|multi[- ]tester|\bv\d{1,2}\b|\b\d{1,2}\b|\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b)/i;

export function titleLooksLikeShoe(title: string): boolean {
  return SHOE_TITLE.test(title);
}

export interface RssDeps { fetchText: (url: string) => Promise<string> }

const liveDeps: RssDeps = {
  fetchText: async url => {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    // irunfar answers 406 with a perfectly good feed body, so only a non-OK
    // status with no items is treated as a failure.
    if (!res.ok && !text.includes('<item') && !text.includes('<entry')) throw new Error(`HTTP ${res.status}`);
    return text;
  },
};

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function readFeed(feed: { key: string; url: string }, deps: RssDeps = liveDeps): Promise<SourceResult> {
  try {
    const xml = await deps.fetchText(feed.url);
    const parsed = await new Parser().parseString(xml);
    const nominations: Nomination[] = [];
    for (const item of parsed.items) {
      const title = (item.title ?? '').trim();
      const url = item.link ?? '';
      if (!title || !url || !titleLooksLikeShoe(title)) continue;
      nominations.push({ modelText: title, title, url, publishedAt: parseDate(item.isoDate ?? item.pubDate), source: feed.key });
    }
    return { source: feed.key, nominations, empty: nominations.length === 0 };
  } catch (err) {
    return { source: feed.key, nominations: [], empty: true, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function readAllFeeds(deps: RssDeps = liveDeps): Promise<SourceResult[]> {
  return Promise.all(FEEDS.map(f => readFeed(f, deps)));
}
