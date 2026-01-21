'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Map,
  Trophy,
  Mountain,
  Route,
  Calendar,
  Filter,
  X,
  Play,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { extractActivityId, extractYear } from '@/lib/race-map/mapUtils';
import type { Race, Routes, Filters } from '@/lib/race-map/types';
import { cn } from '@/lib/utils';

// Dynamically import the map to avoid SSR issues
const RaceMapView = dynamic(
  () => import('@/components/race-map/RaceMapView').then((mod) => mod.RaceMapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-2xl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Loading map...</p>
        </div>
      </div>
    ),
  }
);

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: 'orange' | 'blue' | 'emerald' | 'purple';
}

function StatCard({ title, value, icon, color = 'orange' }: StatCardProps) {
  const colorClasses = {
    orange: 'from-orange-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center',
            colorClasses[color]
          )}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-zinc-400">{title}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SELECTED RACE DETAILS COMPONENT
// ============================================

interface SelectedRaceDetailsProps {
  race: Race;
  onClose: () => void;
}

function SelectedRaceDetails({ race, onClose }: SelectedRaceDetailsProps) {
  const formatDistance = (distance: string): string => {
    if (!distance) return '—';
    return `${distance} miles`;
  };

  return (
    <div className="p-3 border-b border-zinc-800 bg-orange-500/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Selected Race</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <h4 className="text-sm font-semibold text-orange-500 mb-1">{race.name}</h4>
      <p className="text-xs text-zinc-500 mb-3">{race.date}</p>

      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Distance</span>
          <span className="text-white font-mono">{formatDistance(race.distance)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Time</span>
          <span className="text-white font-mono">{race.time || '—'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Elevation</span>
          <span className="text-white font-mono">{race.elevation ? `${race.elevation}m` : '—'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Position</span>
          <span className="text-white font-mono">{race.position || '—'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Type</span>
          <span className="text-white">{race.type} • {race.terrain}</span>
        </div>
      </div>

      {(race.strava || race.video || race.report) && (
        <div className="flex flex-wrap gap-1.5">
          {race.strava && (
            <a
              href={race.strava}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-md hover:bg-orange-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Strava
            </a>
          )}
          {race.video && (
            <a
              href={race.video}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-md hover:bg-zinc-700 transition-colors"
            >
              <Play className="w-3 h-3" /> Video
            </a>
          )}
          {race.report && (
            <a
              href={race.report}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-md hover:bg-zinc-700 transition-colors"
            >
              <FileText className="w-3 h-3" /> Report
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// RACE LIST ITEM COMPONENT
// ============================================

interface RaceListItemProps {
  race: Race;
  isSelected: boolean;
  onClick: () => void;
}

function RaceListItem({ race, isSelected, onClick }: RaceListItemProps) {
  const formatDistance = (distance: string): string => {
    if (!distance) return '';
    return `${distance} mi`;
  };

  return (
    <div
      className={cn(
        'p-2.5 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-white leading-tight line-clamp-1">{race.name}</span>
        <span
          className={cn(
            'px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase flex-shrink-0',
            race.type === 'Ultra'
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-blue-500/20 text-blue-400'
          )}
        >
          {race.type || 'Race'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <span>{race.date}</span>
        <span>•</span>
        <span>{formatDistance(race.distance)}</span>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function RaceMapPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [routes, setRoutes] = useState<Routes>({});
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    showMarathons: true,
    showUltras: true,
    showRoad: true,
    showTrail: true,
    year: 'all',
  });

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let racesData: Race[] = [];
        let routesData: Routes = {};

        // Try cached files first
        try {
          const [racesRes, routesRes] = await Promise.all([
            fetch('/races-data.json'),
            fetch('/routes-data.json'),
          ]);

          if (racesRes.ok) {
            const cache = await racesRes.json();
            racesData = cache.races || [];
          }
          if (routesRes.ok) {
            const cache = await routesRes.json();
            routesData = cache.routes || {};
          }
        } catch {
          // Fallback to API
        }

        // Fallback to API if no cached data
        if (racesData.length === 0) {
          const res = await fetch('/api/race-map');
          const data = await res.json();
          if (data.ok) {
            racesData = data.races || [];
            routesData = data.routes || {};
          }
        }

        setRaces(racesData);
        setRoutes(routesData);
      } catch (err) {
        console.error('Failed to load race data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Get unique years
  const years = useMemo(() => {
    const yearSet = new Set<string>();
    races.forEach((race) => {
      const year = extractYear(race.date);
      if (year) yearSet.add(year);
    });
    return Array.from(yearSet).sort().reverse();
  }, [races]);

  // Filter races
  const filteredRaces = useMemo(() => {
    return races.filter((race) => {
      if (race.type === 'Marathon' && !filters.showMarathons) return false;
      if (race.type === 'Ultra' && !filters.showUltras) return false;
      if (race.terrain === 'Road' && !filters.showRoad) return false;
      if (race.terrain === 'Trail' && !filters.showTrail) return false;
      if (filters.year !== 'all') {
        const raceYear = extractYear(race.date);
        if (raceYear !== filters.year) return false;
      }
      return true;
    });
  }, [races, filters]);

  // Filter routes
  const filteredRoutes = useMemo(() => {
    const result: Routes = {};
    filteredRaces.forEach((race) => {
      const activityId = extractActivityId(race.strava);
      if (activityId && routes[activityId]) {
        result[activityId] = routes[activityId];
      }
    });
    return result;
  }, [filteredRaces, routes]);

  // Stats
  const stats = useMemo(() => {
    const marathons = races.filter((r) => r.type === 'Marathon').length;
    const ultras = races.filter((r) => r.type === 'Ultra').length;
    return { total: races.length, marathons, ultras, years: years.length };
  }, [races, years]);

  const handleFilterChange = (key: keyof Filters, value: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRaceSelect = useCallback((race: Race | null) => {
    setSelectedRace(race);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!filters.showMarathons) count++;
    if (!filters.showUltras) count++;
    if (!filters.showRoad) count++;
    if (!filters.showTrail) count++;
    if (filters.year !== 'all') count++;
    return count;
  }, [filters]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
          <div className="container py-20">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              <span className="text-zinc-400">Loading race map...</span>
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
        <section className="py-8 lg:py-12 border-b border-zinc-800">
          <div className="container">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full text-sm font-medium mb-4">
                  <Map className="w-4 h-4" />
                  Visualization Tool
                </div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                  Race Map
                </h1>
                <p className="text-zinc-400 max-w-xl">
                  Every marathon and ultra I&apos;ve run, visualized on a single map. Click any route to see race details.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  title="Total Races"
                  value={stats.total}
                  icon={<Trophy className="w-5 h-5 text-white" />}
                  color="orange"
                />
                <StatCard
                  title="Marathons"
                  value={stats.marathons}
                  icon={<Route className="w-5 h-5 text-white" />}
                  color="blue"
                />
                <StatCard
                  title="Ultras"
                  value={stats.ultras}
                  icon={<Mountain className="w-5 h-5 text-white" />}
                  color="emerald"
                />
                <StatCard
                  title="Years"
                  value={stats.years}
                  icon={<Calendar className="w-5 h-5 text-white" />}
                  color="purple"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filters Bar */}
        <section className="py-4 bg-zinc-900 border-b border-zinc-800 sticky top-16 lg:top-20 z-30">
          <div className="container">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    showFilters || activeFiltersCount > 0
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <span className="text-sm text-zinc-400">
                  Showing <span className="text-white font-medium">{filteredRaces.length}</span> races
                </span>
              </div>

              {selectedRace && (
                <button
                  onClick={() => setSelectedRace(null)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear selection
                </button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showMarathons}
                      onChange={(e) => handleFilterChange('showMarathons', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                    />
                    Marathons
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showUltras}
                      onChange={(e) => handleFilterChange('showUltras', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                    />
                    Ultras
                  </label>
                </div>

                <div className="w-px h-6 bg-zinc-700" />

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showRoad}
                      onChange={(e) => handleFilterChange('showRoad', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                    />
                    Road
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showTrail}
                      onChange={(e) => handleFilterChange('showTrail', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                    />
                    Trail
                  </label>
                </div>

                <div className="w-px h-6 bg-zinc-700" />

                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="all">All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() =>
                    setFilters({
                      showMarathons: true,
                      showUltras: true,
                      showRoad: true,
                      showTrail: true,
                      year: 'all',
                    })
                  }
                  className="text-sm text-zinc-400 hover:text-orange-500 transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Map + Race List */}
        <section className="py-8">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Map */}
              <div className="lg:col-span-2">
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden h-[500px] lg:h-[600px]">
                  <RaceMapView
                    races={filteredRaces}
                    routes={filteredRoutes}
                    selectedRace={selectedRace}
                    onRaceSelect={handleRaceSelect}
                  />
                </div>
              </div>

              {/* Race List */}
              <div className="lg:col-span-1">
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden h-[500px] lg:h-[600px] flex flex-col">
                  <div className="p-3 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      Race List
                    </h2>
                    <span className="text-xs text-zinc-500">{filteredRaces.length} races</span>
                  </div>

                  {/* Selected Race Details */}
                  {selectedRace && (
                    <SelectedRaceDetails
                      race={selectedRace}
                      onClose={() => setSelectedRace(null)}
                    />
                  )}

                  {/* Race List Items */}
                  <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
                    {filteredRaces.length === 0 ? (
                      <p className="text-center text-zinc-500 py-8 text-xs">
                        No races match your filters
                      </p>
                    ) : (
                      filteredRaces.map((race) => (
                        <RaceListItem
                          key={race.number}
                          race={race}
                          isSelected={selectedRace?.number === race.number}
                          onClick={() => handleRaceSelect(race)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
