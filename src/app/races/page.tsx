'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  Clock,
  Mountain,
  Route,
  Medal,
  Timer,
  Search,
  X,
  ExternalLink,
  Play,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp,
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

// Distance categories (in km)
const DISTANCE_CATEGORIES = {
  '100mile': { min: 146, max: 190, label: '100 Mile' },
  '100km': { min: 86, max: 145, label: '100km' },
  '50mile': { min: 70, max: 85, label: '50 Mile' },
  '50km': { min: 45, max: 69, label: '50km' },
  marathon: { min: 42, max: 44, label: 'Marathon' },
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDistance(km: number | null): string {
  if (!km) return '—';
  return `${km.toFixed(1)} km`;
}

function timeToDecimalHours(hms: string | null): number {
  if (!hms) return 0;
  const parts = hms.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) + parseInt(parts[1]) / 60 + parseInt(parts[2]) / 3600;
  }
  return 0;
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
}

function StatCard({ title, value, icon, onClick, color = 'orange' }: StatCardProps) {
  const colorClasses = {
    orange: 'from-orange-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <button
      onClick={onClick}
      className="bg-surface rounded-2xl p-6 border border-border hover:border-brand/50 transition-all text-left w-full group shadow-sm"
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
      <div className="text-3xl font-bold text-foreground mb-1 group-hover:text-brand transition-colors">
        {value}
      </div>
      <div className="text-sm text-muted">{title}</div>
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
      className="bg-surface-secondary/50 rounded-xl p-4 border border-border hover:border-brand/50 transition-all text-left w-full"
    >
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted">{title}</div>
    </button>
  );
}

// ============================================
// CHART COMPONENT
// ============================================

interface ChartProps {
  title: string;
  subtitle: string;
  races: Race[];
  color: string;
  icon: React.ReactNode;
}

function RaceChart({ title, subtitle, races, color, icon }: ChartProps) {
  return (
    <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted mb-6">{subtitle}</p>

      <div className="space-y-3">
        {races.map((race, index) => {
          const hours = timeToDecimalHours(race.timeHms);
          const maxHours = Math.max(...races.map((r) => timeToDecimalHours(r.timeHms)));
          const percentage = maxHours > 0 ? (hours / maxHours) * 100 : 0;
          const year = race.date?.substring(0, 4) || '';

          return (
            <div key={race.id} className="group">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-secondary truncate max-w-[200px]">
                  <span className="text-muted mr-2">{String(index + 1).padStart(2, '0')}</span>
                  {race.event}
                  {year && <span className="text-muted ml-1">({year})</span>}
                </span>
                <span className="font-mono text-foreground">{race.timeHms || '—'}</span>
              </div>
              <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// RACE TABLE ROW
// ============================================

interface RaceRowProps {
  race: Race;
}

function RaceRow({ race }: RaceRowProps) {
  return (
    <tr className="border-b border-border hover:bg-surface-secondary/50 transition-colors">
      <td className="py-4 px-4 text-sm text-muted">{formatDate(race.date)}</td>
      <td className="py-4 px-4">
        <span className="font-medium text-foreground">{race.event}</span>
      </td>
      <td className="py-4 px-4">
        {race.type && (
          <span
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              race.type === 'Marathon'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
            )}
          >
            {race.type}
          </span>
        )}
      </td>
      <td className="py-4 px-4 text-sm text-secondary">{formatDistance(race.distanceKm)}</td>
      <td className="py-4 px-4">
        <code className="text-sm text-foreground bg-surface-tertiary px-2 py-1 rounded">
          {race.timeHms || '—'}
        </code>
      </td>
      <td className="py-4 px-4 text-sm text-muted">
        {race.elev ? `${race.elev} m` : '—'}
      </td>
      <td className="py-4 px-4 text-sm text-muted">{race.pos || '—'}</td>
      <td className="py-4 px-4">
        {race.terrain && (
          <span className="px-2 py-1 text-xs bg-surface-tertiary text-secondary rounded-full">
            {race.terrain}
          </span>
        )}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {race.video && (
            <a
              href={race.video}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-surface-secondary rounded transition-colors"
              title="Watch Video"
            >
              <Play className="w-4 h-4 text-muted hover:text-brand" />
            </a>
          )}
          {race.strava && (
            <a
              href={race.strava}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-surface-secondary rounded transition-colors"
              title="View on Strava"
            >
              <Activity className="w-4 h-4 text-muted hover:text-brand" />
            </a>
          )}
          {race.results && (
            <a
              href={race.results}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-surface-secondary rounded transition-colors"
              title="View Results"
            >
              <FileText className="w-4 h-4 text-muted hover:text-brand" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================
// MOBILE RACE CARD
// ============================================

function MobileRaceCard({ race }: RaceRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted">{formatDate(race.date)}</span>
        {race.type && (
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              race.type === 'Marathon'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
            )}
          >
            {race.type}
          </span>
        )}
      </div>

      <h3 className="font-medium text-foreground mb-3">{race.event}</h3>

      <div className="flex items-center justify-between mb-3">
        <code className="text-lg font-bold text-foreground bg-surface-tertiary px-3 py-1 rounded">
          {race.timeHms || '—'}
        </code>
        <span className="text-muted">{formatDistance(race.distanceKm)}</span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm text-muted hover:text-brand transition-colors"
      >
        {expanded ? 'Less Details' : 'More Details'}
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Elevation</span>
            <span className="text-secondary">{race.elev ? `${race.elev} m` : '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Position</span>
            <span className="text-secondary">{race.pos || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Surface</span>
            <span className="text-secondary">{race.terrain || '—'}</span>
          </div>
          {(race.video || race.strava || race.results) && (
            <div className="flex items-center gap-3 pt-2">
              {race.video && (
                <a
                  href={race.video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover"
                >
                  <Play className="w-4 h-4" /> Video
                </a>
              )}
              {race.strava && (
                <a
                  href={race.strava}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover"
                >
                  <Activity className="w-4 h-4" /> Strava
                </a>
              )}
              {race.results && (
                <a
                  href={race.results}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-brand hover:text-brand-hover"
                >
                  <FileText className="w-4 h-4" /> Results
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function RacesPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters from URL params
  const initialYear = searchParams.get('year') || '';
  const initialType = searchParams.get('type') || '';
  const initialTerrain = searchParams.get('terrain') || '';
  const initialDistance = searchParams.get('distance') || '';

  // Filters
  const [yearFilter, setYearFilter] = useState(initialYear);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [terrainFilter, setTerrainFilter] = useState(initialTerrain);
  const [distanceFilter, setDistanceFilter] = useState(initialDistance);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeFilterLabel, setActiveFilterLabel] = useState<string | null>(() => {
    if (initialYear) return `Year ${initialYear}`;
    if (initialType) return `All ${initialType}s`;
    if (initialDistance) {
      const cat = DISTANCE_CATEGORIES[initialDistance as keyof typeof DISTANCE_CATEGORIES];
      return cat?.label || null;
    }
    return null;
  });

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

  // Filter races
  const filteredRaces = useMemo(() => {
    if (!data) return [];

    return data.data.filter((race) => {
      if (yearFilter && race.date && !race.date.startsWith(yearFilter)) return false;
      if (typeFilter && race.type !== typeFilter) return false;
      if (terrainFilter && race.terrain !== terrainFilter) return false;
      if (searchFilter && !race.event.toLowerCase().includes(searchFilter.toLowerCase()))
        return false;

      if (distanceFilter) {
        const cat = DISTANCE_CATEGORIES[distanceFilter as keyof typeof DISTANCE_CATEGORIES];
        if (cat && (!race.distanceKm || race.distanceKm < cat.min || race.distanceKm > cat.max)) {
          return false;
        }
      }

      return true;
    });
  }, [data, yearFilter, typeFilter, terrainFilter, distanceFilter, searchFilter]);

  // Filter handlers
  const resetFilters = () => {
    setYearFilter('');
    setTypeFilter('');
    setTerrainFilter('');
    setDistanceFilter('');
    setSearchFilter('');
    setActiveFilterLabel(null);
  };

  const filterByType = (type: string, label: string) => {
    resetFilters();
    setTypeFilter(type);
    setActiveFilterLabel(label);
  };

  const filterByDistance = (category: string) => {
    resetFilters();
    setDistanceFilter(category);
    const cat = DISTANCE_CATEGORIES[category as keyof typeof DISTANCE_CATEGORIES];
    setActiveFilterLabel(cat?.label || null);
  };

  const filterByCombo = (type: string, terrain: string, label: string) => {
    resetFilters();
    setTypeFilter(type);
    setTerrainFilter(terrain);
    setActiveFilterLabel(label);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 bg-background min-h-screen">
          <div className="container py-20">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
              <span className="text-muted">Loading race data...</span>
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
        <main className="pt-20 lg:pt-24 bg-background min-h-screen">
          <div className="container py-20">
            <div className="text-center">
              <p className="text-error mb-4">Error loading data: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
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

      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero */}
        <section className="py-12 lg:py-16">
          <div className="container">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Race Dashboard
            </h1>
            <p className="text-lg text-secondary max-w-2xl">
              Complete race history from marathons to ultra marathons. Click any stat to filter
              the results.
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
                onClick={resetFilters}
                color="orange"
              />
              <StatCard
                title="Marathons"
                value={stats?.marathons || 0}
                icon={<Route className="w-6 h-6 text-white" />}
                onClick={() => filterByType('Marathon', 'All Marathons')}
                color="blue"
              />
              <StatCard
                title="Ultras"
                value={stats?.ultras || 0}
                icon={<Mountain className="w-6 h-6 text-white" />}
                onClick={() => filterByType('Ultra', 'All Ultras')}
                color="emerald"
              />
              <StatCard
                title="Years Racing"
                value={stats?.years || 0}
                icon={<Calendar className="w-6 h-6 text-white" />}
                onClick={() => (window.location.href = '/races/years')}
                color="purple"
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
                onClick={() => filterByDistance('100mile')}
              />
              <SubStatCard
                title="100km"
                value={stats?.hundredKm || 0}
                onClick={() => filterByDistance('100km')}
              />
              <SubStatCard
                title="50 Mile"
                value={stats?.fiftyMile || 0}
                onClick={() => filterByDistance('50mile')}
              />
              <SubStatCard
                title="50km"
                value={stats?.fiftyKm || 0}
                onClick={() => filterByDistance('50km')}
              />
              <SubStatCard
                title="Road Marathon"
                value={stats?.roadMarathon || 0}
                onClick={() => filterByCombo('Marathon', 'Road', 'Road Marathons')}
              />
              <SubStatCard
                title="Trail Marathon"
                value={stats?.trailMarathon || 0}
                onClick={() => filterByCombo('Marathon', 'Trail', 'Trail Marathons')}
              />
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="pb-12">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-6">
              <RaceChart
                title="Top-10 Fastest Marathons"
                subtitle="Performance ranking by completion time"
                races={data?.marathons || []}
                color="bg-blue-500"
                icon={<Timer className="w-5 h-5 text-blue-500" />}
              />
              <RaceChart
                title="Top-10 Longest Ultras"
                subtitle="Epic races by completion time"
                races={data?.ultras || []}
                color="bg-orange-500"
                icon={<Mountain className="w-5 h-5 text-orange-500" />}
              />
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 bg-surface-secondary border-y border-border sticky top-16 lg:top-20 z-30">
          <div className="container">
            {/* Active Filter Indicator */}
            {activeFilterLabel && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-muted">Filtering:</span>
                <span className="px-3 py-1 bg-brand/20 text-brand text-sm rounded-full flex items-center gap-2">
                  {activeFilterLabel}
                  <button onClick={resetFilters} className="hover:text-brand-hover">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <select
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setActiveFilterLabel(e.target.value ? `Year ${e.target.value}` : null);
                }}
                className="input"
              >
                <option value="">All Years</option>
                {data?.years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  if (!e.target.value) setActiveFilterLabel(null);
                }}
                className="input"
              >
                <option value="">All Types</option>
                <option value="Marathon">Marathon</option>
                <option value="Ultra">Ultra</option>
              </select>

              <select
                value={terrainFilter}
                onChange={(e) => setTerrainFilter(e.target.value)}
                className="input"
              >
                <option value="">All Surfaces</option>
                <option value="Road">Road</option>
                <option value="Trail">Trail</option>
                <option value="Mixed">Mixed</option>
              </select>

              <select
                value={distanceFilter}
                onChange={(e) => {
                  setDistanceFilter(e.target.value);
                  const cat =
                    DISTANCE_CATEGORIES[e.target.value as keyof typeof DISTANCE_CATEGORIES];
                  setActiveFilterLabel(cat?.label || null);
                }}
                className="input"
              >
                <option value="">All Distances</option>
                <option value="100mile">100 Mile (146-190km)</option>
                <option value="100km">100km (86-145km)</option>
                <option value="50mile">50 Mile (70-85km)</option>
                <option value="50km">50km (45-69km)</option>
                <option value="marathon">Marathon (42-44km)</option>
              </select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search race name..."
                  className="input w-full pl-10"
                />
              </div>

              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-surface border border-border text-secondary rounded-lg hover:bg-surface-secondary transition-colors text-sm"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 text-sm text-muted">
              Showing {filteredRaces.length} result{filteredRaces.length !== 1 ? 's' : ''}
            </div>
          </div>
        </section>

        {/* Results Table (Desktop) */}
        <section className="py-8 hidden lg:block">
          <div className="container">
            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-secondary text-left">
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Date</th>
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Event</th>
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Type</th>
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Distance</th>
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Time</th>
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Elevation</th>
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Position</th>
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Surface</th>
                      <th className="py-3 px-4 text-sm font-medium text-secondary">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRaces.map((race) => (
                      <RaceRow key={race.id} race={race} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Results Cards (Mobile) */}
        <section className="py-8 lg:hidden">
          <div className="container">
            <div className="space-y-4">
              {filteredRaces.map((race) => (
                <MobileRaceCard key={race.id} race={race} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
