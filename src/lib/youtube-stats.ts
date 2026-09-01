import { prisma } from '@/lib/db';

/**
 * Cached YouTube statistics.
 *
 * View counts on marketing pages go stale fast, so rather than hardcoding them
 * we keep a small cache table and refresh any row older than a week the next
 * time a page asks for it. A refresh costs one quota unit against a daily
 * allowance of 10,000, so the cache exists to keep pages fast, not to ration
 * quota. Everything here fails soft: if YouTube is unreachable we serve the
 * stale cache, and if the cache is empty we serve nothing and let the caller
 * fall back to its own hardcoded figure.
 */

export const STATS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** The main Film My Run channel (not "Virtual FMR", used by /live). */
export const FILM_MY_RUN_CHANNEL_ID = 'UCjphxoB7x0A_VhB1CUz3AwA';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface ChannelStats {
  subscribers: number;
  totalViews: number;
}

/**
 * Render a raw count in the house style: '48K+', '1.5K+', '8M+'.
 *
 * Always rounds down, so the figure on the page is one we can defend.
 */
export function formatCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return '0';
  if (count < 1000) return String(Math.floor(count));

  const [value, suffix] =
    count < 1_000_000 ? [count / 1000, 'K'] : [count / 1_000_000, 'M'];

  // Whole thousands read better once we are past 10K ('48K+', not '48.8K+').
  const decimals = suffix === 'K' && value >= 10 ? 0 : 1;
  const factor = 10 ** decimals;
  const rounded = Math.floor(value * factor) / factor;

  return `${String(rounded)}${suffix}+`;
}

/**
 * Which of `ids` need refetching — those with no cached row, or a row older
 * than `maxAgeMs`. Preserves input order and drops duplicates.
 */
export function selectStaleIds(
  ids: string[],
  cached: { youtube_id: string; updated_at: Date }[],
  now: Date = new Date(),
  maxAgeMs: number = STATS_MAX_AGE_MS
): string[] {
  const freshestById = new Map(cached.map((row) => [row.youtube_id, row.updated_at]));
  const cutoff = now.getTime() - maxAgeMs;

  return [...new Set(ids)].filter((id) => {
    const updatedAt = freshestById.get(id);
    return !updatedAt || updatedAt.getTime() < cutoff;
  });
}

function apiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || null;
}

/**
 * Current view counts for the given video IDs, keyed by ID.
 *
 * IDs YouTube does not return (deleted, private, bad ID) are simply absent
 * from the map — callers fall back to their own copy.
 */
export async function getVideoViewCounts(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();

  let cached: { youtube_id: string; view_count: number; updated_at: Date }[] = [];
  try {
    cached = await prisma.youtube_video_stats.findMany({
      where: { youtube_id: { in: ids } },
    });
  } catch (error) {
    console.error('[youtube-stats] cache read failed:', error);
  }

  const counts = new Map(cached.map((row) => [row.youtube_id, row.view_count]));
  const stale = selectStaleIds(ids, cached);
  const key = apiKey();

  if (stale.length === 0 || !key) {
    if (stale.length > 0 && !key) {
      console.warn('[youtube-stats] YOUTUBE_API_KEY not set; serving cached view counts');
    }
    return counts;
  }

  try {
    const url = `${API_BASE}/videos?part=statistics&id=${stale.join(',')}&key=${key}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`videos.list returned ${response.status}`);
    }

    const body = (await response.json()) as {
      items?: { id: string; statistics?: { viewCount?: string } }[];
    };

    const fetched = new Map<string, number>();
    for (const item of body.items ?? []) {
      const views = Number(item.statistics?.viewCount);
      if (Number.isFinite(views)) fetched.set(item.id, views);
    }

    for (const [youtube_id, view_count] of fetched) {
      counts.set(youtube_id, view_count);
    }

    await Promise.all(
      [...fetched].map(([youtube_id, view_count]) =>
        prisma.youtube_video_stats.upsert({
          where: { youtube_id },
          create: { youtube_id, view_count },
          update: { view_count, updated_at: new Date() },
        })
      )
    );
  } catch (error) {
    // Serve whatever the cache had; a stale number beats a broken page.
    console.error('[youtube-stats] view count refresh failed:', error);
  }

  return counts;
}

/**
 * Subscriber and lifetime view totals for the Film My Run channel, or null if
 * we have never successfully fetched them.
 */
export async function getChannelStats(
  channelId: string = FILM_MY_RUN_CHANNEL_ID
): Promise<ChannelStats | null> {
  let cached: { subscribers: number; total_views: number; updated_at: Date } | null = null;
  try {
    cached = await prisma.youtube_channel_stats.findUnique({ where: { channel_id: channelId } });
  } catch (error) {
    console.error('[youtube-stats] channel cache read failed:', error);
  }

  const fallback = cached ? { subscribers: cached.subscribers, totalViews: cached.total_views } : null;
  const stale = selectStaleIds(
    [channelId],
    cached ? [{ youtube_id: channelId, updated_at: cached.updated_at }] : []
  );
  const key = apiKey();

  if (stale.length === 0 || !key) return fallback;

  try {
    const url = `${API_BASE}/channels?part=statistics&id=${channelId}&key=${key}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`channels.list returned ${response.status}`);
    }

    const body = (await response.json()) as {
      items?: { statistics?: { subscriberCount?: string; viewCount?: string } }[];
    };

    const statistics = body.items?.[0]?.statistics;
    const subscribers = Number(statistics?.subscriberCount);
    const totalViews = Number(statistics?.viewCount);
    if (!Number.isFinite(subscribers) || !Number.isFinite(totalViews)) {
      throw new Error('channels.list returned no usable statistics');
    }

    await prisma.youtube_channel_stats.upsert({
      where: { channel_id: channelId },
      create: { channel_id: channelId, subscribers, total_views: totalViews },
      update: { subscribers, total_views: totalViews, updated_at: new Date() },
    });

    return { subscribers, totalViews };
  } catch (error) {
    console.error('[youtube-stats] channel stats refresh failed:', error);
    return fallback;
  }
}
