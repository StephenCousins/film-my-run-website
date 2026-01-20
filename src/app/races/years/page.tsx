'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  Mountain,
  Route,
  Ruler,
  Timer,
  MapPin,
  Loader2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface Race {
  id: number;
  date: string | null;
  event: string;
  type: string | null;
  distanceKm: number | null;
  timeHms: string | null;
  secs: number | null;
  elev: number | null;
  pos: string | null;
  terrain: string | null;
  video: string | null;
  strava: string | null;
  results: string | null;
}

interface ApiResponse {
  ok: boolean;
  data: Race[];
  marathons: Race[];
  ultras: Race[];
  years: number[];
}

interface YearStats {
  year: number;
  raceCount: number;
  longestRace: Race | null;
  fastestRace: Race | null;
  biggestElevRace: Race | null;
  marathonCount: number;
  ultraCount: number;
}

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  onClick?: () => void;
  color?: string;
  active?: boolean;
}

function StatCard({ title, value, icon, onClick, color = 'orange', active }: StatCardProps) {
  const colorClasses = {
    orange: 'from-orange-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-zinc-900 rounded-2xl p-6 border transition-all text-left w-full group',
        active ? 'border-orange-500' : 'border-zinc-800 hover:border-orange-500/50'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center',
            colorClasses[color as keyof typeof colorClasses]
          )}
        >
          {icon}
        </div>
      </div>
      <div
        className={cn(
          'text-3xl font-bold mb-1 transition-colors',
          active ? 'text-orange-500' : 'text-white group-hover:text-orange-500'
        )}
      >
        {value}
      </div>
      <div className="text-sm text-zinc-400">{title}</div>
    </button>
  );
}

// ============================================
// SUB-STAT CARD COMPONENT
// ============================================

interface SubStatCardProps {
  title: string;
  value: number;
  onClick?: () => void;
}

function SubStatCard({ title, value, onClick }: SubStatCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 hover:border-orange-500/50 transition-all text-left w-full"
    >
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-zinc-400">{title}</div>
    </button>
  );
}

// ============================================
// YEAR CARD COMPONENT
// ============================================

interface YearCardProps {
  stats: YearStats;
}

function YearCard({ stats }: YearCardProps) {
  return (
    <Link
      href={`/races?year=${stats.year}`}
      className="bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-orange-500/50 transition-all overflow-hidden group"
    >
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <div className="text-3xl font-bold text-white group-hover:text-orange-500 transition-colors">
          {stats.year}
        </div>
        <div className="text-sm text-zinc-400">
          {stats.raceCount} race{stats.raceCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 space-y-4">
        {/* Longest Distance */}
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Ruler className="w-3 h-3" />
            Longest Distance
          </div>
          <div className="text-lg font-medium text-white">
            {stats.longestRace?.distanceKm
              ? `${stats.longestRace.distanceKm.toFixed(1)} km`
              : '—'}
          </div>
          {stats.longestRace && (
            <div className="text-xs text-zinc-500 truncate">{stats.longestRace.event}</div>
          )}
        </div>

        {/* Fastest Time */}
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Timer className="w-3 h-3" />
            Fastest Time
          </div>
          <div className="text-lg font-medium text-white">
            {stats.fastestRace?.timeHms || '—'}
          </div>
          {stats.fastestRace && (
            <div className="text-xs text-zinc-500 truncate">{stats.fastestRace.event}</div>
          )}
        </div>

        {/* Most Elevation */}
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Mountain className="w-3 h-3" />
            Most Elevation
          </div>
          <div className="text-lg font-medium text-white">
            {stats.biggestElevRace?.elev ? `${stats.biggestElevRace.elev} m` : '—'}
          </div>
          {stats.biggestElevRace?.elev && (
            <div className="text-xs text-zinc-500 truncate">{stats.biggestElevRace.event}</div>
          )}
        </div>

        {/* Breakdown */}
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <MapPin className="w-3 h-3" />
            Breakdown
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">
              <span className="text-blue-400 font-medium">{stats.marathonCount}</span>
              <span className="text-zinc-500 ml-1">
                Marathon{stats.marathonCount !== 1 ? 's' : ''}
              </span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-sm">
              <span className="text-orange-400 font-medium">{stats.ultraCount}</span>
              <span className="text-zinc-500 ml-1">Ultra{stats.ultraCount !== 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function YearsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/races');
        const result = await response.json();

        if (!result.ok) {
          throw new Error(result.message || 'Failed to load data');
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    if (!data) return null;

    const races = data.data;
    const marathons = races.filter((r) => r.type === 'Marathon');
    const ultras = races.filter((r) => r.type === 'Ultra');

    // Sub-stats
    const hundredMile = races.filter(
      (r) => r.distanceKm && r.distanceKm >= 146 && r.distanceKm <= 190
    ).length;
    const hundredKm = races.filter(
      (r) => r.distanceKm && r.distanceKm >= 86 && r.distanceKm <= 145
    ).length;
    const fiftyMile = races.filter(
      (r) => r.distanceKm && r.distanceKm >= 70 && r.distanceKm <= 85
    ).length;
    const fiftyKm = races.filter(
      (r) => r.distanceKm && r.distanceKm >= 45 && r.distanceKm <= 69
    ).length;
    const roadMarathon = marathons.filter((r) => r.terrain === 'Road').length;
    const trailMarathon = marathons.filter((r) => r.terrain === 'Trail').length;

    return {
      total: races.length,
      marathons: marathons.length,
      ultras: ultras.length,
      years: data.years.length,
      hundredMile,
      hundredKm,
      fiftyMile,
      fiftyKm,
      roadMarathon,
      trailMarathon,
    };
  }, [data]);

  // Calculate year stats
  const yearStats = useMemo(() => {
    if (!data) return [];

    return data.years.map((year) => {
      const yearRaces = data.data.filter((r) => r.date && r.date.startsWith(year.toString()));

      // Longest distance race
      const longestRace = yearRaces.reduce(
        (max, r) => ((r.distanceKm || 0) > (max?.distanceKm || 0) ? r : max),
        yearRaces[0] || null
      );

      // Fastest time race (lowest seconds)
      const racesWithTime = yearRaces.filter((r) => r.secs);
      const fastestRace =
        racesWithTime.length > 0
          ? racesWithTime.reduce((min, r) => ((r.secs || Infinity) < (min.secs || Infinity) ? r : min), racesWithTime[0])
          : yearRaces[0] || null;

      // Biggest elevation race
      const biggestElevRace = yearRaces.reduce(
        (max, r) => ((r.elev || 0) > (max?.elev || 0) ? r : max),
        yearRaces[0] || null
      );

      // Counts by type
      const marathonCount = yearRaces.filter((r) => r.type === 'Marathon').length;
      const ultraCount = yearRaces.filter((r) => r.type === 'Ultra').length;

      return {
        year,
        raceCount: yearRaces.length,
        longestRace,
        fastestRace,
        biggestElevRace,
        marathonCount,
        ultraCount,
      };
    });
  }, [data]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
          <div className="container py-20">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              <span className="text-zinc-400">Loading race data...</span>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
          <div className="container py-20">
            <div className="text-center">
              <p className="text-red-400 mb-4">Error loading data: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero */}
        <section className="py-12 lg:py-16">
          <div className="container">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Racing Year by Year
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl">
              Explore racing history organized by year. Click any year card to view all races from
              that year.
            </p>
          </div>
        </section>

        {/* Main Stats */}
        <section className="pb-8">
          <div className="container">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Races"
                value={stats?.total || 0}
                icon={<Trophy className="w-6 h-6 text-white" />}
                onClick={() => (window.location.href = '/races')}
                color="orange"
              />
              <StatCard
                title="Marathons"
                value={stats?.marathons || 0}
                icon={<Route className="w-6 h-6 text-white" />}
                onClick={() => (window.location.href = '/races?type=Marathon')}
                color="blue"
              />
              <StatCard
                title="Ultras"
                value={stats?.ultras || 0}
                icon={<Mountain className="w-6 h-6 text-white" />}
                onClick={() => (window.location.href = '/races?type=Ultra')}
                color="emerald"
              />
              <StatCard
                title="Years Racing"
                value={stats?.years || 0}
                icon={<Calendar className="w-6 h-6 text-white" />}
                color="purple"
                active
              />
            </div>
          </div>
        </section>

        {/* Sub Stats */}
        <section className="pb-12">
          <div className="container">
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              <SubStatCard
                title="100 Mile"
                value={stats?.hundredMile || 0}
                onClick={() => (window.location.href = '/races?distance=100mile')}
              />
              <SubStatCard
                title="100km"
                value={stats?.hundredKm || 0}
                onClick={() => (window.location.href = '/races?distance=100km')}
              />
              <SubStatCard
                title="50 Mile"
                value={stats?.fiftyMile || 0}
                onClick={() => (window.location.href = '/races?distance=50mile')}
              />
              <SubStatCard
                title="50km"
                value={stats?.fiftyKm || 0}
                onClick={() => (window.location.href = '/races?distance=50km')}
              />
              <SubStatCard
                title="Road Marathon"
                value={stats?.roadMarathon || 0}
                onClick={() => (window.location.href = '/races?type=Marathon&terrain=Road')}
              />
              <SubStatCard
                title="Trail Marathon"
                value={stats?.trailMarathon || 0}
                onClick={() => (window.location.href = '/races?type=Marathon&terrain=Trail')}
              />
            </div>
          </div>
        </section>

        {/* Year Cards */}
        <section className="pb-16">
          <div className="container">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {yearStats.map((ys) => (
                <YearCard key={ys.year} stats={ys} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
