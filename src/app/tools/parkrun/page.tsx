'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Trophy,
  Medal,
  MapPin,
  Calendar,
  TrendingUp,
  Clock,
  Users,
  Flame,
  ChartBar,
  Award,
  Sparkles,
  Globe,
  AlertCircle,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Components
import { ParkrunStatCard, SubStat } from '@/components/parkrun/ParkrunStatCard';
import { RecentRunsTable } from '@/components/parkrun/RecentRunsTable';
import { PaceChart } from '@/components/parkrun/PaceChart';
import { YearByYearSection } from '@/components/parkrun/YearByYearSection';
import { VenueCardCompact } from '@/components/parkrun/VenueCardCompact';
import { VenueMap } from '@/components/parkrun/VenueMap';
import { AgeCategoryChart } from '@/components/parkrun/AgeCategoryChart';
import { AchievementBadge, PBProgression, StreakDisplay } from '@/components/parkrun/AchievementBadge';
import { InsightsSection } from '@/components/parkrun/InsightsSection';
import { RankingsSearch } from '@/components/parkrun/RankingsSearch';

// Types
import type {
  ParkrunResult,
  YearlyStats,
  VenueStats,
  AgeCategoryStats,
  VenueCoordinate,
  ParkrunMetadata,
} from '@/lib/parkrun-types';

interface ParkrunData {
  ok: boolean;
  parkruns: ParkrunResult[];
  recentRuns: ParkrunResult[];
  yearlyStats: YearlyStats[];
  venues: VenueStats[];
  ageCategoryStats: AgeCategoryStats[];
  venueCoordinates: VenueCoordinate[];
  metadata: ParkrunMetadata;
  pbProgression: { date: string; time_seconds: number; venue: string }[];
  streakInfo: {
    currentStreak: number;
    longestStreak: number;
    longestStreakStart: string;
    longestStreakEnd: string;
  };
  monthlyStats: { month: string; runs: number; average_time: number }[];
  insights: {
    rollingAverage: number;
    seasonalAverages: {
      winter: number;
      spring: number;
      summer: number;
      autumn: number;
    };
    bestSeason: 'winter' | 'spring' | 'summer' | 'autumn';
    fastestVenues: VenueStats[];
    totalImprovement: number;
  };
  achievements: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    earnedDate?: string;
    category: 'milestone' | 'venue' | 'speed' | 'streak' | 'special';
  }[];
  error?: string;
}

// Section wrapper component
function Section({
  id,
  title,
  icon: Icon,
  children,
  className = '',
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-12 lg:py-16 ${className}`}>
      <div className="container">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-green-500/10">
            <Icon className="w-5 h-5 text-green-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function ParkrunPage() {
  const [data, setData] = useState<ParkrunData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/parkrun');
        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || 'Failed to fetch parkrun data');
        }

        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen bg-zinc-950">
          <div className="container py-20">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-zinc-400">Loading your parkrun stats...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen bg-zinc-950">
          <div className="container py-20">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Unable to load data</h2>
              <p className="text-zinc-400 mb-6">{error || 'Something went wrong'}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Calculate cumulative totals for year cards
  const cumulativeTotals = data.yearlyStats.reduce<number[]>((acc, stat, index) => {
    if (index === 0) {
      acc.push(stat.runs);
    } else {
      acc.push(acc[index - 1] + stat.runs);
    }
    return acc;
  }, []);

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-zinc-950">
        {/* ==================== HERO SECTION ==================== */}
        <section className="relative py-16 lg:py-24 overflow-hidden">
          {/* Video background */}
          <div className="absolute inset-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/parkrun-hero.mp4" type="video/mp4" />
              <source src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/parkrun-hero.webm" type="video/webm" />
            </video>
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/60 to-zinc-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/50 via-transparent to-zinc-950/50" />
          </div>

          <div className="container relative">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 backdrop-blur-sm text-green-400 rounded-full text-sm font-medium mb-4 border border-green-500/30">
                <Activity className="w-4 h-4" />
                My parkrun Journey
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-2 drop-shadow-lg">
                parkrun Stats
              </h1>
              <p className="text-zinc-300 drop-shadow-md">
                {data.metadata.firstParkrunDate} – {data.metadata.lastParkrunDate}
              </p>
            </motion.div>

            {/* Big stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <ParkrunStatCard
                label="Total Runs"
                value={data.metadata.totalParkruns}
                subValue={`${data.metadata.totalDistanceKm}km total distance`}
                icon={<Calendar className="w-6 h-6 text-green-500" />}
              />
              <ParkrunStatCard
                label="Personal Best"
                value={data.metadata.personalBestFormatted}
                subValue={`at ${data.metadata.personalBestVenue}`}
                icon={<Trophy className="w-6 h-6 text-amber-500" />}
                highlight
              />
              <ParkrunStatCard
                label="Best Position"
                value={data.metadata.bestPosition}
                subValue="in age category"
                icon={<Medal className="w-6 h-6 text-amber-400" />}
              />
              <ParkrunStatCard
                label="Unique Venues"
                value={data.metadata.uniqueVenues}
                subValue="different parkruns"
                icon={<MapPin className="w-6 h-6 text-purple-500" />}
              />
            </div>

            {/* Sub stats */}
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <SubStat label="First Run" value={data.metadata.firstParkrunDate} />
              <div className="w-px h-8 bg-zinc-700" />
              <SubStat label="Last Run" value={data.metadata.lastParkrunDate} />
              <div className="w-px h-8 bg-zinc-700 hidden sm:block" />
              <SubStat label="PB Date" value={data.metadata.personalBestDate} />
            </div>
          </div>
        </section>

        {/* ==================== ALL RUNS ==================== */}
        <Section id="recent" title="All Runs" icon={Clock}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <RecentRunsTable runs={data.parkruns} />
            </div>
            <div className="px-4 py-3 bg-zinc-800/50 border-t border-zinc-800 text-center">
              <span className="text-sm text-zinc-400">{data.parkruns.length} total runs</span>
            </div>
          </div>
        </Section>

        {/* ==================== PROGRESS CHART ==================== */}
        <Section id="progress" title="Performance Over Time" icon={TrendingUp} className="bg-zinc-900/50">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <PaceChart
              parkruns={data.parkruns}
              personalBest={data.metadata.personalBest}
            />
          </div>
        </Section>

        {/* ==================== YEAR BY YEAR ==================== */}
        <YearByYearSection
          yearlyStats={data.yearlyStats}
          cumulativeTotals={cumulativeTotals}
        />

        {/* ==================== VENUES ==================== */}
        <Section id="venues" title="Venues Visited" icon={MapPin} className="bg-zinc-900/50">
          {/* Stats header */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-zinc-400">
              <span className="text-2xl font-bold text-white">{data.metadata.uniqueVenues}</span>
              {' '}different parkruns visited
            </p>
          </div>

          {/* Map */}
          {data.venueCoordinates.length > 0 && (
            <div className="mb-6 relative">
              <VenueMap venues={data.venueCoordinates} />
            </div>
          )}

          {/* Scrolling venue cards */}
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {data.venues.map((venue, index) => (
              <VenueCardCompact
                key={venue.event}
                venue={venue}
                index={index}
                isHome={index === 0 && venue.visit_count >= 20}
              />
            ))}
          </div>
        </Section>

        {/* ==================== AGE CATEGORY ==================== */}
        <Section id="positions" title="Age Category Positions" icon={Users}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <AgeCategoryChart stats={data.ageCategoryStats} />
          </div>
        </Section>

        {/* ==================== ACHIEVEMENTS ==================== */}
        <Section id="achievements" title="Achievements" icon={Award} className="bg-zinc-900/50">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* PB Progression */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                PB Timeline
              </h3>
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pr-2">
                <PBProgression pbs={[...data.pbProgression].reverse()} />
              </div>
            </div>

            {/* Streaks */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Streaks
              </h3>
              <StreakDisplay {...data.streakInfo} />
            </div>

            {/* Quick achievements summary */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <p className="text-zinc-400 text-sm">Achievements Earned</p>
                  <p className="text-2xl font-bold text-white">
                    {data.achievements.filter(a => a.earned).length} / {data.achievements.length}
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <p className="text-zinc-400 text-sm">PBs Set</p>
                  <p className="text-2xl font-bold text-green-400">{data.pbProgression.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Achievement badges grid */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">All Achievements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.achievements.map((achievement, index) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  index={index}
                />
              ))}
            </div>
          </div>
        </Section>

        {/* ==================== INSIGHTS ==================== */}
        <Section id="insights" title="Insights & Analytics" icon={ChartBar}>
          <InsightsSection
            monthlyStats={data.monthlyStats}
            seasonalAverages={data.insights.seasonalAverages}
            bestSeason={data.insights.bestSeason}
            fastestVenues={data.insights.fastestVenues}
            totalImprovement={data.insights.totalImprovement}
            rollingAverage={data.insights.rollingAverage}
          />
        </Section>

        {/* ==================== UK RANKINGS ==================== */}
        <Section id="rankings" title="UK parkrun Rankings" icon={Globe} className="bg-zinc-900/50">
          <RankingsSearch />
        </Section>
      </main>

      <Footer />
    </>
  );
}
