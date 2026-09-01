import { unstable_cache } from 'next/cache';
import { getVideoViewCounts, getChannelStats, formatCount } from '@/lib/youtube-stats';
import DocumentaryFilmsClient from './DocumentaryFilmsClient';
import { pastWork, fallbackChannelStats } from './films';

// Rendered per request rather than at build time: Railway's DATABASE_URL points
// at the private network, which is only reachable once the app is running, so a
// build-time prerender would find no cached stats and fall back. unstable_cache
// keeps that from meaning a database round trip on every visit.
export const dynamic = 'force-dynamic';

const CACHE_TTL_SECONDS = 3600;

const loadStats = unstable_cache(
  async () => {
    const [counts, channel] = await Promise.all([
      getVideoViewCounts(pastWork.map((film) => film.id)),
      getChannelStats(),
    ]);

    return {
      viewCounts: Object.fromEntries(
        [...counts].map(([id, views]) => [id, formatCount(views)])
      ),
      channelStats: channel
        ? {
            subscribers: formatCount(channel.subscribers),
            totalViews: formatCount(channel.totalViews),
          }
        : fallbackChannelStats,
    };
  },
  ['documentary-films-youtube-stats'],
  { revalidate: CACHE_TTL_SECONDS }
);

export default async function DocumentaryFilmsPage() {
  const { viewCounts, channelStats } = await loadStats();

  return <DocumentaryFilmsClient viewCounts={viewCounts} channelStats={channelStats} />;
}
