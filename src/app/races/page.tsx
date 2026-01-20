'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  Filter,
  Search,
  ChevronDown,
  Mountain,
  Route,
  Medal,
  Timer,
  ArrowUpDown,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface Race {
  id: string;
  name: string;
  date: string;
  location: string;
  distance: number;
  distanceUnit: 'km' | 'miles';
  elevation?: number;
  time: string;
  pace: string;
  position?: number;
  totalRunners?: number;
  category: 'marathon' | 'ultra' | 'half' | '10k' | '5k' | 'parkrun' | 'other';
  terrain: 'road' | 'trail' | 'mixed';
  notes?: string;
}

// ============================================
// PLACEHOLDER DATA
// ============================================

const placeholderRaces: Race[] = [
  {
    id: '1',
    name: 'London Marathon',
    date: '2024-04-21',
    location: 'London, UK',
    distance: 42.195,
    distanceUnit: 'km',
    time: '2:58:42',
    pace: '4:13/km',
    position: 1247,
    totalRunners: 48000,
    category: 'marathon',
    terrain: 'road',
    notes: 'Finally sub-3!',
  },
  {
    id: '2',
    name: 'TDS (UTMB)',
    date: '2022-08-31',
    location: 'Chamonix, France',
    distance: 145,
    distanceUnit: 'km',
    elevation: 9100,
    time: '32:45:18',
    pace: '13:33/km',
    position: 412,
    totalRunners: 1847,
    category: 'ultra',
    terrain: 'trail',
  },
  {
    id: '3',
    name: 'Lakeland 100',
    date: '2023-07-28',
    location: 'Lake District, UK',
    distance: 105,
    distanceUnit: 'miles',
    elevation: 6500,
    time: '28:12:45',
    pace: '16:07/mile',
    position: 89,
    totalRunners: 350,
    category: 'ultra',
    terrain: 'trail',
  },
  {
    id: '4',
    name: 'Manchester Marathon',
    date: '2023-04-16',
    location: 'Manchester, UK',
    distance: 42.195,
    distanceUnit: 'km',
    time: '3:02:18',
    pace: '4:19/km',
    position: 892,
    totalRunners: 25000,
    category: 'marathon',
    terrain: 'road',
  },
  {
    id: '5',
    name: 'Bushy parkrun',
    date: '2024-01-13',
    location: 'Bushy Park, London',
    distance: 5,
    distanceUnit: 'km',
    time: '19:42',
    pace: '3:56/km',
    position: 28,
    totalRunners: 1245,
    category: 'parkrun',
    terrain: 'trail',
  },
  {
    id: '6',
    name: 'South Downs Way 100',
    date: '2018-06-09',
    location: 'Winchester to Eastbourne',
    distance: 100,
    distanceUnit: 'miles',
    elevation: 4000,
    time: '24:18:33',
    pace: '14:35/mile',
    position: 67,
    totalRunners: 280,
    category: 'ultra',
    terrain: 'trail',
    notes: 'First 100 miler!',
  },
  {
    id: '7',
    name: 'Brighton Marathon',
    date: '2023-04-02',
    location: 'Brighton, UK',
    distance: 42.195,
    distanceUnit: 'km',
    time: '3:08:45',
    pace: '4:28/km',
    position: 1456,
    totalRunners: 12000,
    category: 'marathon',
    terrain: 'road',
  },
  {
    id: '8',
    name: 'Thames Path 100km',
    date: '2013-03-02',
    location: 'Richmond to Oxford',
    distance: 100,
    distanceUnit: 'km',
    time: '11:45:22',
    pace: '7:03/km',
    position: 45,
    totalRunners: 150,
    category: 'ultra',
    terrain: 'mixed',
    notes: 'First ultra!',
  },
];

const stats = {
  totalRaces: 174,
  marathons: 94,
  ultras: 80,
  totalDistance: 8542,
  totalElevation: 186000,
  fastestMarathon: '2:58:42',
  longestRace: '268 miles',
};

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color?: string;
}

function StatCard({ icon: Icon, value, label, color = 'text-orange-500' }: StatCardProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg bg-zinc-800', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="font-mono text-xl font-bold text-white">
            {value}
          </div>
          <div className="text-xs text-zinc-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RACE ROW
// ============================================

function RaceRow({ race }: { race: Race }) {
  const categoryColors: Record<string, string> = {
    marathon: 'bg-blue-500/10 text-blue-500',
    ultra: 'bg-purple-500/10 text-purple-500',
    half: 'bg-emerald-500/10 text-emerald-500',
    '10k': 'bg-amber-500/10 text-amber-500',
    '5k': 'bg-cyan-500/10 text-cyan-500',
    parkrun: 'bg-green-500/10 text-green-500',
    other: 'bg-zinc-500/10 text-zinc-500',
  };

  const terrainIcons: Record<string, React.ElementType> = {
    road: Route,
    trail: Mountain,
    mixed: MapPin,
  };

  const TerrainIcon = terrainIcons[race.terrain];

  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
      <td className="py-4 px-4">
        <div>
          <div className="font-medium text-white">{race.name}</div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
            <MapPin className="w-3 h-3" />
            {race.location}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Calendar className="w-4 h-4" />
          {new Date(race.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', categoryColors[race.category])}>
            {race.category}
          </span>
          <TerrainIcon className="w-4 h-4 text-zinc-400" />
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="text-sm">
          <span className="font-medium text-white">
            {race.distance} {race.distanceUnit}
          </span>
          {race.elevation && (
            <span className="text-zinc-500 ml-2">
              +{race.elevation.toLocaleString()}m
            </span>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="font-mono text-sm font-medium text-white">
          {race.time}
        </div>
        <div className="text-xs text-zinc-500">{race.pace}</div>
      </td>
      <td className="py-4 px-4">
        {race.position && race.totalRunners && (
          <div className="text-sm">
            <span className="font-medium text-white">
              {race.position.toLocaleString()}
            </span>
            <span className="text-zinc-500">
              /{race.totalRunners.toLocaleString()}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}

// ============================================
// RACES PAGE
// ============================================

export default function RacesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [terrainFilter, setTerrainFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'distance' | 'time'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort races
  const filteredRaces = useMemo(() => {
    let result = [...placeholderRaces];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (race) =>
          race.name.toLowerCase().includes(query) ||
          race.location.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((race) => race.category === categoryFilter);
    }

    // Terrain filter
    if (terrainFilter !== 'all') {
      result = result.filter((race) => race.terrain === terrainFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'distance') {
        const distA = a.distanceUnit === 'miles' ? a.distance * 1.60934 : a.distance;
        const distB = b.distanceUnit === 'miles' ? b.distance * 1.60934 : b.distance;
        comparison = distA - distB;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [searchQuery, categoryFilter, terrainFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'date' | 'distance' | 'time') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero */}
        <section className="py-12 lg:py-16 bg-zinc-900 border-b border-zinc-800">
          <div className="container">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                  Race Dashboard
                </h1>
                <p className="text-zinc-400">
                  Every race, every finish line, every story. Tracking since 2011.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono text-3xl font-bold text-orange-500">
                    {stats.totalRaces}
                  </div>
                  <div className="text-sm text-zinc-500">Total Races</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="py-8 bg-zinc-950">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={Trophy} value={stats.marathons} label="Marathons" />
              <StatCard icon={Mountain} value={stats.ultras} label="Ultras" />
              <StatCard icon={Route} value={`${(stats.totalDistance / 1000).toFixed(1)}K km`} label="Total Distance" />
              <StatCard icon={TrendingUp} value={`${(stats.totalElevation / 1000).toFixed(0)}K m`} label="Total Elevation" />
              <StatCard icon={Timer} value={stats.fastestMarathon} label="Fastest Marathon" />
              <StatCard icon={Medal} value={stats.longestRace} label="Longest Race" />
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 bg-zinc-900 border-y border-zinc-800 sticky top-16 lg:top-20 z-30">
          <div className="container">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="search"
                  placeholder="Search races..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-transparent rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-zinc-400" />

                {/* Category */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="all">All Categories</option>
                  <option value="marathon">Marathons</option>
                  <option value="ultra">Ultras</option>
                  <option value="half">Half Marathons</option>
                  <option value="10k">10K</option>
                  <option value="5k">5K</option>
                  <option value="parkrun">Parkruns</option>
                </select>

                {/* Terrain */}
                <select
                  value={terrainFilter}
                  onChange={(e) => setTerrainFilter(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="all">All Terrain</option>
                  <option value="road">Road</option>
                  <option value="trail">Trail</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              {/* Results count */}
              <div className="text-sm text-zinc-500">
                {filteredRaces.length} races
              </div>
            </div>
          </div>
        </section>

        {/* Race Table */}
        <section className="py-8">
          <div className="container">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-800/50 text-left">
                      <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Race
                      </th>
                      <th
                        className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-orange-500"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th
                        className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-orange-500"
                        onClick={() => toggleSort('distance')}
                      >
                        <div className="flex items-center gap-1">
                          Distance
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Time / Pace
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Position
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRaces.map((race) => (
                      <RaceRow key={race.id} race={race} />
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRaces.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-zinc-500">No races found matching your filters.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Year breakdown */}
        <section className="py-12 bg-zinc-950">
          <div className="container">
            <h2 className="font-display text-2xl font-bold text-white mb-6">
              Races by Year
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {[2024, 2023, 2022, 2021, 2020, 2019, 2018].map((year) => {
                const count = placeholderRaces.filter(
                  (r) => new Date(r.date).getFullYear() === year
                ).length;
                return (
                  <div
                    key={year}
                    className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-center"
                  >
                    <div className="font-mono text-2xl font-bold text-orange-500">{count}</div>
                    <div className="text-sm text-zinc-500">{year}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-zinc-900">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
                Explore More Tools
              </h2>
              <p className="text-zinc-400 mb-8">
                Use our calculators to plan your next race or dive into your parkrun stats.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/tools/calculators"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
                >
                  Running Calculators
                </Link>
                <Link
                  href="/tools/parkrun"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 text-white font-semibold rounded-full hover:bg-zinc-700 transition-colors"
                >
                  Parkrun Stats
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
