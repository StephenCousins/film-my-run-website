'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  TrendingUp,
  Calendar,
  Clock,
  Award,
  Users,
  MapPin,
  ChevronRight,
  BarChart3,
  Target,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ============================================
// SAMPLE DATA
// ============================================

const sampleStats = {
  totalRuns: 247,
  totalDistance: 1235,
  averageTime: '22:34',
  pb: '19:12',
  firstRun: '2011-01-15',
  lastRun: '2024-01-13',
  homeEvent: 'Bushy parkrun',
  differentEvents: 42,
  volunteeringCount: 23,
};

const recentRuns = [
  { date: '2024-01-13', event: 'Bushy parkrun', time: '21:45', position: 34 },
  { date: '2024-01-06', event: 'Richmond parkrun', time: '22:12', position: 28 },
  { date: '2023-12-30', event: 'Bushy parkrun', time: '21:33', position: 41 },
  { date: '2023-12-23', event: 'Fulham Palace parkrun', time: '22:45', position: 52 },
  { date: '2023-12-16', event: 'Bushy parkrun', time: '21:28', position: 37 },
];

// ============================================
// PARKRUN PAGE
// ============================================

export default function ParkrunPage() {
  const [athleteId, setAthleteId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteId.trim()) return;

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setHasSearched(true);
    }, 1500);
  };

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-zinc-950">
        {/* Hero */}
        <section className="py-12 lg:py-16 bg-zinc-900 border-b border-zinc-800">
          <div className="container">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                parkrun Stats
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Parkrun Statistics
              </h1>
              <p className="text-lg text-zinc-400">
                Track your parkrun history, compare performances, and visualize your progress
                over time. Enter your athlete ID to get started.
              </p>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="py-8 bg-zinc-900 border-b border-zinc-800">
          <div className="container">
            <form onSubmit={handleSearch} className="max-w-xl">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={athleteId}
                    onChange={(e) => setAthleteId(e.target.value)}
                    placeholder="Enter parkrun athlete ID (e.g., A12345)"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !athleteId.trim()}
                  className={cn(
                    'px-6 py-3 font-semibold rounded-xl transition-all',
                    isLoading || !athleteId.trim()
                      ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  )}
                >
                  {isLoading ? 'Loading...' : 'Search'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Results */}
        {hasSearched && (
          <section className="py-12 lg:py-16">
            <div className="container">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[
                  { label: 'Total Runs', value: sampleStats.totalRuns, icon: Calendar },
                  { label: 'Total Distance', value: `${sampleStats.totalDistance}km`, icon: MapPin },
                  { label: 'Average Time', value: sampleStats.averageTime, icon: Clock },
                  { label: 'Personal Best', value: sampleStats.pb, icon: Award },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6"
                    >
                      <Icon className="w-5 h-5 text-orange-500 mb-3" />
                      <div className="font-mono text-2xl font-bold text-white mb-1">
                        {stat.value}
                      </div>
                      <div className="text-sm text-zinc-500">{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Recent runs */}
                <div className="lg:col-span-2">
                  <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="p-6 border-b border-zinc-800">
                      <h2 className="font-display text-xl font-bold text-white">
                        Recent Runs
                      </h2>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {recentRuns.map((run, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                        >
                          <div>
                            <div className="font-medium text-white">
                              {run.event}
                            </div>
                            <div className="text-sm text-zinc-500">{run.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-orange-500">{run.time}</div>
                            <div className="text-sm text-zinc-500">#{run.position}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Profile card */}
                  <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
                    <h3 className="font-display font-bold text-white mb-4">
                      Athlete Profile
                    </h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">Home Event</dt>
                        <dd className="font-medium text-white">
                          {sampleStats.homeEvent}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">Different Events</dt>
                        <dd className="font-medium text-white">
                          {sampleStats.differentEvents}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">Volunteering</dt>
                        <dd className="font-medium text-white">
                          {sampleStats.volunteeringCount} times
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">First Run</dt>
                        <dd className="font-medium text-white">
                          {sampleStats.firstRun}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Quick links */}
                  <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
                    <h3 className="font-display font-bold text-white mb-4">
                      More Tools
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/tools/calculators"
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors group"
                      >
                        <span className="text-zinc-300 group-hover:text-orange-500">
                          Pace Calculator
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-orange-500" />
                      </Link>
                      <Link
                        href="/tools/race-map"
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors group"
                      >
                        <span className="text-zinc-300 group-hover:text-orange-500">
                          Race Map
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-orange-500" />
                      </Link>
                      <Link
                        href="/races"
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors group"
                      >
                        <span className="text-zinc-300 group-hover:text-orange-500">
                          Race Dashboard
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-orange-500" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Placeholder when not searched */}
        {!hasSearched && (
          <section className="py-16 lg:py-24">
            <div className="container">
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="font-display text-2xl font-bold text-white mb-4">
                  Enter Your Athlete ID
                </h2>
                <p className="text-zinc-400 mb-8">
                  Your parkrun athlete ID can be found on your barcode or on the parkrun website.
                  Enter it above to view your complete parkrun history and statistics.
                </p>

                <div className="grid sm:grid-cols-3 gap-6 text-left">
                  {[
                    {
                      icon: TrendingUp,
                      title: 'Track Progress',
                      description: 'See how your times have improved over the years',
                    },
                    {
                      icon: Target,
                      title: 'Set Goals',
                      description: 'Predict when you might hit your next milestone',
                    },
                    {
                      icon: MapPin,
                      title: 'Explore Events',
                      description: 'See all the different parkrun events you have visited',
                    },
                  ].map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.title} className="p-4">
                        <Icon className="w-6 h-6 text-orange-500 mb-3" />
                        <h3 className="font-semibold text-white mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-zinc-500">{feature.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
