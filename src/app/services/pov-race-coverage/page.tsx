import { unstable_cache } from 'next/cache';
import { getVideoViewCounts, getChannelStats, formatCount } from '@/lib/youtube-stats';
import POVRaceCoverageClient from './POVRaceCoverageClient';
import { pastRaces } from './races';

// Live view counts, the same way as /services/documentary-films (docs/youtube-stats.md): per request because the
// database isn't reachable at build time, with unstable_cache so it isn't a query per visit.
export const dynamic = 'force-dynamic';

// The channel total on 22 Oct 2026, rounded down, for when YouTube and the cache are both unavailable.
const FALLBACK_TOTAL_VIEWS = '8M+';

const loadStats = unstable_cache(
  async () => {
    const [counts, channel] = await Promise.all([getVideoViewCounts(pastRaces.map((r) => r.id)), getChannelStats()]);
    return {
      viewCounts: Object.fromEntries([...counts].map(([id, views]) => [id, formatCount(views)])),
      totalViews: channel ? formatCount(channel.totalViews) : FALLBACK_TOTAL_VIEWS,
    };
  },
  ['pov-race-coverage-youtube-stats'],
  { revalidate: 3600 }
);

export default async function POVRaceCoveragePage() {
  const { viewCounts, totalViews } = await loadStats();
  return <POVRaceCoverageClient viewCounts={viewCounts} totalViews={totalViews} />;
}
