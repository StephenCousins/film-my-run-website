import { getVideoViewCounts, getChannelStats, formatCount } from '@/lib/youtube-stats';
import DocumentaryFilmsClient from './DocumentaryFilmsClient';
import { pastWork, fallbackChannelStats } from './films';

// View counts come from a weekly-refreshed cache, so rendering per request is
// cheap; the revalidate window just keeps the rendered HTML from going stale
// once that cache updates.
export const revalidate = 3600;

export default async function DocumentaryFilmsPage() {
  const [counts, channel] = await Promise.all([
    getVideoViewCounts(pastWork.map((film) => film.id)),
    getChannelStats(),
  ]);

  const viewCounts = Object.fromEntries(
    [...counts].map(([id, views]) => [id, formatCount(views)])
  );

  const channelStats = channel
    ? {
        subscribers: formatCount(channel.subscribers),
        totalViews: formatCount(channel.totalViews),
      }
    : fallbackChannelStats;

  return <DocumentaryFilmsClient viewCounts={viewCounts} channelStats={channelStats} />;
}
