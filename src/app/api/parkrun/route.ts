import { NextResponse } from 'next/server';
import {
  getAllParkruns,
  getYearlyStats,
  getVenueStats,
  getAgeCategoryStats,
  getVenueCoordinates,
  getMetadata,
  getPBProgression,
  getStreakInfo,
  getMonthlyStats,
} from '@/lib/parkrun-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all data in parallel for better performance
    const [
      parkruns,
      yearlyStats,
      venues,
      ageCategoryStats,
      venueCoordinates,
      metadata,
      pbProgression,
      streakInfo,
      monthlyStats,
    ] = await Promise.all([
      getAllParkruns(),
      getYearlyStats(),
      getVenueStats(),
      getAgeCategoryStats(),
      getVenueCoordinates(),
      getMetadata(),
      getPBProgression(),
      getStreakInfo(),
      getMonthlyStats(),
    ]);

    // Calculate additional insights
    const recentRuns = parkruns.slice(0, 5);

    // Calculate rolling 12-month average
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const recentMonthlyStats = monthlyStats.filter(
      m => new Date(m.month + '-01') >= twelveMonthsAgo
    );
    const rollingAverage = recentMonthlyStats.length > 0
      ? Math.round(
          recentMonthlyStats.reduce((sum, m) => sum + m.average_time, 0) /
          recentMonthlyStats.length
        )
      : 0;

    // Calculate seasonal performance
    const seasonalPerformance = {
      winter: { total: 0, count: 0 }, // Dec, Jan, Feb
      spring: { total: 0, count: 0 }, // Mar, Apr, May
      summer: { total: 0, count: 0 }, // Jun, Jul, Aug
      autumn: { total: 0, count: 0 }, // Sep, Oct, Nov
    };

    parkruns.forEach(run => {
      const month = new Date(run.date).getMonth();
      if (month === 11 || month === 0 || month === 1) {
        seasonalPerformance.winter.total += run.time_seconds;
        seasonalPerformance.winter.count++;
      } else if (month >= 2 && month <= 4) {
        seasonalPerformance.spring.total += run.time_seconds;
        seasonalPerformance.spring.count++;
      } else if (month >= 5 && month <= 7) {
        seasonalPerformance.summer.total += run.time_seconds;
        seasonalPerformance.summer.count++;
      } else {
        seasonalPerformance.autumn.total += run.time_seconds;
        seasonalPerformance.autumn.count++;
      }
    });

    const seasonalAverages = {
      winter: seasonalPerformance.winter.count > 0
        ? Math.round(seasonalPerformance.winter.total / seasonalPerformance.winter.count)
        : 0,
      spring: seasonalPerformance.spring.count > 0
        ? Math.round(seasonalPerformance.spring.total / seasonalPerformance.spring.count)
        : 0,
      summer: seasonalPerformance.summer.count > 0
        ? Math.round(seasonalPerformance.summer.total / seasonalPerformance.summer.count)
        : 0,
      autumn: seasonalPerformance.autumn.count > 0
        ? Math.round(seasonalPerformance.autumn.total / seasonalPerformance.autumn.count)
        : 0,
    };

    // Find best season
    const seasons = ['winter', 'spring', 'summer', 'autumn'] as const;
    const bestSeason = seasons.reduce((best, season) =>
      seasonalAverages[season] > 0 &&
      (seasonalAverages[best] === 0 || seasonalAverages[season] < seasonalAverages[best])
        ? season
        : best
    , 'winter' as typeof seasons[number]);

    // Top 5 fastest venues (min 3 visits)
    const fastestVenues = venues
      .filter(v => v.visit_count >= 3)
      .sort((a, b) => a.best_time_seconds - b.best_time_seconds)
      .slice(0, 5);

    // Calculate total improvement (first run vs PB)
    const firstRunTime = parkruns.length > 0
      ? parkruns[parkruns.length - 1].time_seconds
      : 0;
    const totalImprovement = firstRunTime - metadata.personalBest;

    // Build achievements list
    const achievements = buildAchievements(
      metadata,
      venues,
      pbProgression,
      streakInfo,
      yearlyStats
    );

    return NextResponse.json({
      ok: true,
      parkruns,
      recentRuns,
      yearlyStats,
      venues,
      ageCategoryStats,
      venueCoordinates,
      metadata,
      pbProgression,
      streakInfo,
      monthlyStats,
      insights: {
        rollingAverage,
        seasonalAverages,
        bestSeason,
        fastestVenues,
        totalImprovement,
      },
      achievements,
    });
  } catch (error) {
    console.error('Error fetching parkrun data:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch parkrun data',
      },
      { status: 500 }
    );
  }
}

// Build achievements based on milestones
function buildAchievements(
  metadata: Awaited<ReturnType<typeof getMetadata>>,
  venues: Awaited<ReturnType<typeof getVenueStats>>,
  pbProgression: Awaited<ReturnType<typeof getPBProgression>>,
  streakInfo: Awaited<ReturnType<typeof getStreakInfo>>,
  yearlyStats: Awaited<ReturnType<typeof getYearlyStats>>
) {
  const achievements: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    earnedDate?: string;
    category: 'milestone' | 'venue' | 'speed' | 'streak' | 'special';
  }[] = [];

  // Milestone achievements
  const runMilestones = [
    { count: 50, name: '50 Club', icon: '🏃' },
    { count: 100, name: 'Century', icon: '💯' },
    { count: 150, name: '150 Milestone', icon: '🎯' },
    { count: 200, name: 'Double Century', icon: '🏅' },
    { count: 250, name: '250 Club', icon: '⭐' },
    { count: 300, name: 'Triple Century', icon: '🌟' },
    { count: 500, name: 'Legend', icon: '👑' },
  ];

  runMilestones.forEach(milestone => {
    achievements.push({
      id: `runs-${milestone.count}`,
      name: milestone.name,
      description: `Complete ${milestone.count} parkruns`,
      icon: milestone.icon,
      earned: metadata.totalParkruns >= milestone.count,
      category: 'milestone',
    });
  });

  // Venue achievements
  const venueMilestones = [
    { count: 10, name: 'Tourist', icon: '🗺️' },
    { count: 25, name: 'Explorer', icon: '🧭' },
    { count: 50, name: 'Adventurer', icon: '🏔️' },
    { count: 100, name: 'Globetrotter', icon: '🌍' },
  ];

  venueMilestones.forEach(milestone => {
    achievements.push({
      id: `venues-${milestone.count}`,
      name: milestone.name,
      description: `Visit ${milestone.count} different parkruns`,
      icon: milestone.icon,
      earned: metadata.uniqueVenues >= milestone.count,
      category: 'venue',
    });
  });

  // Speed achievements (based on time)
  const speedMilestones = [
    { time: 30 * 60, name: 'Sub-30', icon: '🚀' },
    { time: 25 * 60, name: 'Sub-25', icon: '💨' },
    { time: 22 * 60, name: 'Sub-22', icon: '⚡' },
    { time: 20 * 60, name: 'Sub-20', icon: '🔥' },
    { time: 18 * 60, name: 'Sub-18', icon: '🏎️' },
  ];

  speedMilestones.forEach(milestone => {
    const earned = metadata.personalBest <= milestone.time;
    const pb_date = earned
      ? pbProgression.find(p => p.time_seconds <= milestone.time)?.date
      : undefined;

    achievements.push({
      id: `speed-${milestone.time}`,
      name: milestone.name,
      description: `Run a parkrun in under ${milestone.time / 60} minutes`,
      icon: milestone.icon,
      earned,
      earnedDate: pb_date,
      category: 'speed',
    });
  });

  // Streak achievements
  const streakMilestones = [
    { weeks: 4, name: 'Month Strong', icon: '📅' },
    { weeks: 13, name: 'Quarter Master', icon: '🗓️' },
    { weeks: 26, name: 'Half Year Hero', icon: '📆' },
    { weeks: 52, name: 'Year Warrior', icon: '🎊' },
  ];

  streakMilestones.forEach(milestone => {
    achievements.push({
      id: `streak-${milestone.weeks}`,
      name: milestone.name,
      description: `Run parkrun for ${milestone.weeks} consecutive weeks`,
      icon: milestone.icon,
      earned: streakInfo.longestStreak >= milestone.weeks,
      category: 'streak',
    });
  });

  // Special achievements
  achievements.push({
    id: 'first-place',
    name: 'Champion',
    description: 'Finish first in your age category',
    icon: '🥇',
    earned: metadata.bestPosition === 1,
    category: 'special',
  });

  // Check for consistent years
  const yearsWithMinRuns = yearlyStats.filter(y => y.runs >= 20).length;
  achievements.push({
    id: 'dedication',
    name: 'Dedicated',
    description: 'Run 20+ parkruns in a single year',
    icon: '💪',
    earned: yearsWithMinRuns > 0,
    category: 'special',
  });

  // Home venue badge (venue with most visits)
  if (venues.length > 0 && venues[0].visit_count >= 50) {
    achievements.push({
      id: 'home-hero',
      name: 'Home Hero',
      description: `Run 50+ times at ${venues[0].event}`,
      icon: '🏠',
      earned: true,
      category: 'venue',
    });
  }

  return achievements;
}
