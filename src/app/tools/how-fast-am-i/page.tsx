'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Search,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  Award,
  Users,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type Tab = 'parkrun' | 'po10';

const STORAGE_KEY = 'howfast_last_search';

interface ParkrunResult {
  event: string;
  runDate: string;
  time: string;
  time_seconds: number;
  position: string;
  ageGrade?: string | null;
  pb: boolean;
}

interface ParkrunData {
  ok: boolean;
  cached?: boolean;
  stale?: boolean;
  needsRefresh?: boolean;
  warning?: string;
  error?: string;
  athlete?: {
    name: string;
    athleteId: string;
    totalRuns: number;
    stats?: {
      bestSeconds: number;
      bestTime: string;
      averageTime: string;
      typicalAvgTime: string;
      recentAvgTime: string | null;
      pbEvent: string;
      pbDate: string;
      pbAge: string;
      trend: string;
      trendMessage: string;
      avgAgeGrade: number | null;
      recentAvgAgeGrade: number | null;
      outlierCount: number;
      normalRunCount: number;
    };
    recentResults?: ParkrunResult[];
    allResults?: ParkrunResult[];
  };
  comparison?: {
    percentile: number;
    abilityLevel: string;
    ratingMessage: string;
    parkrunComparisons: {
      name: string;
      benchmarkTime: string;
      differenceStr: string;
      faster: boolean;
    }[];
  };
}

interface Po10PB {
  time: string;
  seconds: number;
  timeFormatted: string;
}

interface Po10Data {
  ok: boolean;
  cached?: boolean;
  needsRefresh?: boolean;
  error?: string;
  athlete?: {
    name: string;
    athleteId: string;
    club: string | null;
    ageGroup: string | null;
    gender: string | null;
    pbs: Record<string, Po10PB>;
  };
  stats?: {
    distances: {
      distance: string;
      distanceName: string;
      time: string;
      percentile: number;
      abilityLevel: string;
    }[];
    overallPercentile: number;
    overallAbilityLevel: string;
    ratingMessage: string;
  };
}

export default function HowFastAmIPage() {
  const { requireAuth, LoginModal } = useRequireAuth({ feature: 'parkrun stats' });
  const [activeTab, setActiveTab] = useState<Tab>('parkrun');
  const [athleteId, setAthleteId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parkrunData, setParkrunData] = useState<ParkrunData | null>(null);
  const [po10Data, setPo10Data] = useState<Po10Data | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  const doSearch = useCallback(async (tab: Tab, id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = tab === 'parkrun'
        ? `/api/how-fast/parkrun?id=${id}`
        : `/api/how-fast/po10?id=${id}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to fetch data');
        if (tab === 'parkrun') setParkrunData(null);
        else setPo10Data(null);
      } else {
        if (tab === 'parkrun') {
          setParkrunData(data);
          setPo10Data(null);
        } else {
          setPo10Data(data);
          setParkrunData(null);
        }

        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ tab, id }));
        } catch {}

        // Trigger background refresh if needed
        if (data.needsRefresh) {
          backgroundRefresh(tab, id);
        }
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const backgroundRefresh = async (tab: Tab, id: string) => {
    setIsRefreshing(true);
    setRefreshResult(null);

    try {
      const endpoint = tab === 'parkrun'
        ? '/api/how-fast/parkrun/refresh'
        : '/api/how-fast/po10/refresh';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.ok) {
        if (tab === 'parkrun' && data.newResults > 0) {
          setRefreshResult(`Found ${data.newResults} new result${data.newResults > 1 ? 's' : ''}!`);
          // Re-fetch to get updated data
          doSearch(tab, id);
        } else if (tab === 'parkrun') {
          setRefreshResult('All results up to date');
        } else {
          setRefreshResult('Data refreshed');
          doSearch(tab, id);
        }
      }
    } catch {
      // Silently fail background refresh
    } finally {
      setIsRefreshing(false);
      // Clear refresh message after 5 seconds
      setTimeout(() => setRefreshResult(null), 5000);
    }
  };

  const handleSearch = () => {
    if (!athleteId.trim()) {
      setError('Please enter an athlete ID');
      return;
    }
    setShowAllResults(false);
    doSearch(activeTab, athleteId.trim());
  };

  const handleClearSearch = () => {
    setAthleteId('');
    setParkrunData(null);
    setPo10Data(null);
    setError(null);
    setShowAllResults(false);
    setRefreshResult(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Auto-fetch from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { tab, id } = JSON.parse(saved);
        if (tab && id) {
          setActiveTab(tab);
          setAthleteId(id);
          doSearch(tab, id);
        }
      }
    } catch {}
  }, [doSearch]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-muted" />;
    }
  };

  const getAbilityColor = (level: string) => {
    switch (level) {
      case 'elite':
        return 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'advanced':
        return 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'intermediate':
        return 'text-green-500 dark:text-green-400 bg-green-500/10 border-green-500/30';
      case 'novice':
        return 'text-yellow-500 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-secondary bg-surface-tertiary border-border';
    }
  };

  const allResults = parkrunData?.athlete?.allResults || [];
  const displayedResults = showAllResults ? allResults : (parkrunData?.athlete?.recentResults || []);

  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Video Background */}
          <div className="absolute inset-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/fast-running.webm" type="video/webm" />
              <source src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/videos/fast-running.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[rgb(var(--color-background))]" />
          </div>

          <div className="container relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <Activity className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Running Analysis</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                How Fast Are You?
              </h1>

              <p className="text-lg text-zinc-300 max-w-2xl mx-auto">
                Find out how your running compares to others. Enter your parkrun or Power of 10 athlete ID
                to see your percentile ranking, trends, and comparisons.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Tool Section */}
        <section className="py-8 lg:py-16">
          <div className="container">
            <div className="max-w-xl mx-auto">
              {/* Tool Card */}
              <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8">
                {/* Tabs */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex bg-surface-secondary rounded-xl p-1">
                    <button
                      onClick={() => { setActiveTab('parkrun'); setError(null); }}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'parkrun'
                          ? 'bg-brand text-white'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      parkrun
                    </button>
                    <button
                      onClick={() => { setActiveTab('po10'); setError(null); }}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'po10'
                          ? 'bg-brand text-white'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      Power of 10
                    </button>
                  </div>
                </div>

                {/* Search Form */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={athleteId}
                      onChange={(e) => setAthleteId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && requireAuth(handleSearch)}
                      placeholder={activeTab === 'parkrun' ? 'Enter parkrun ID (e.g., 123456)' : 'Enter Power of 10 athlete ID (UUID)'}
                      className="input w-full py-3.5"
                    />
                  </div>
                  <button
                    onClick={() => requireAuth(handleSearch)}
                    disabled={isLoading}
                    className="btn-primary px-6 py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Search
                      </>
                    )}
                  </button>
                </div>

                {/* Help text / Clear link */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <p className="text-sm text-muted flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    {activeTab === 'parkrun'
                      ? 'Find your ID on your parkrun profile page'
                      : 'Find your ID on powerof10.uk'}
                  </p>
                  {(parkrunData || po10Data) && (
                    <button
                      onClick={handleClearSearch}
                      className="text-sm text-muted hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Background Refresh Indicator */}
        {(isRefreshing || refreshResult) && (
          <section className="pb-4">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                {isRefreshing && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Checking for new results...</span>
                  </div>
                )}
                {refreshResult && !isRefreshing && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 text-sm text-green-500 dark:text-green-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{refreshResult}</span>
                  </motion.div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Error State */}
        {error && (
          <section className="py-8">
            <div className="container">
              <div className="max-w-2xl mx-auto">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-red-400 font-semibold mb-1">Error</h3>
                    <p className="text-red-300/80">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Parkrun Results */}
        {parkrunData?.athlete && (
          <section className="py-12">
            <div className="container">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Athlete Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface rounded-2xl border border-border p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{parkrunData.athlete.name}</h2>
                      <p className="text-muted">parkrun ID: {parkrunData.athlete.athleteId}</p>
                    </div>
                    {parkrunData.comparison && (
                      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getAbilityColor(parkrunData.comparison.abilityLevel)}`}>
                        {parkrunData.comparison.abilityLevel.charAt(0).toUpperCase() + parkrunData.comparison.abilityLevel.slice(1)}
                      </span>
                    )}
                  </div>

                  {parkrunData.comparison && (
                    <p className="text-lg text-secondary">{parkrunData.comparison.ratingMessage}</p>
                  )}

                  {parkrunData.stale && parkrunData.warning && (
                    <div className="mt-4 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 rounded-lg px-4 py-2">
                      Using cached data: {parkrunData.warning}
                    </div>
                  )}
                </motion.div>

                {/* Stats Grid */}
                {parkrunData.athlete.stats && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={<Trophy className="w-5 h-5 text-amber-500" />}
                      label="Personal Best"
                      value={parkrunData.athlete.stats.bestTime}
                      subValue={`at ${parkrunData.athlete.stats.pbEvent}`}
                    />
                    <StatCard
                      icon={<Clock className="w-5 h-5 text-blue-500" />}
                      label="Typical Average"
                      value={parkrunData.athlete.stats.typicalAvgTime}
                      subValue="excluding outliers"
                    />
                    <StatCard
                      icon={<Target className="w-5 h-5 text-green-500" />}
                      label="Total Runs"
                      value={parkrunData.athlete.totalRuns.toString()}
                      subValue={`${parkrunData.athlete.stats.normalRunCount} normal runs`}
                    />
                    <StatCard
                      icon={<Award className="w-5 h-5 text-purple-500" />}
                      label="Percentile"
                      value={parkrunData.comparison ? `Top ${Math.round(100 - parkrunData.comparison.percentile)}%` : 'N/A'}
                      subValue={`Faster than ${parkrunData.comparison?.percentile}%`}
                    />
                  </div>
                )}

                {/* Trend & Age Grade */}
                {parkrunData.athlete.stats && (
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="bg-surface rounded-xl border border-border p-6">
                      <div className="flex items-center gap-3 mb-3">
                        {getTrendIcon(parkrunData.athlete.stats.trend)}
                        <h3 className="text-lg font-semibold text-foreground">Performance Trend</h3>
                      </div>
                      <p className="text-muted">{parkrunData.athlete.stats.trendMessage}</p>
                      {parkrunData.athlete.stats.recentAvgTime && (
                        <p className="text-sm text-muted mt-2">
                          Recent average: {parkrunData.athlete.stats.recentAvgTime}
                        </p>
                      )}
                    </div>

                    {parkrunData.athlete.stats.avgAgeGrade && (
                      <div className="bg-surface rounded-xl border border-border p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <Users className="w-5 h-5 text-brand" />
                          <h3 className="text-lg font-semibold text-foreground">Age Grading</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-foreground">{parkrunData.athlete.stats.avgAgeGrade}%</span>
                          <span className="text-muted">average</span>
                        </div>
                        {parkrunData.athlete.stats.recentAvgAgeGrade && (
                          <p className="text-sm text-muted mt-2">
                            Recent: {parkrunData.athlete.stats.recentAvgAgeGrade}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Comparisons */}
                {parkrunData.comparison && (
                  <div className="bg-surface rounded-xl border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">How You Compare</h3>
                    <div className="space-y-3">
                      {parkrunData.comparison.parkrunComparisons.map((comp, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <p className="text-foreground">{comp.name}</p>
                            <p className="text-sm text-muted">{comp.benchmarkTime}</p>
                          </div>
                          <span className={`font-mono ${comp.faster ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {comp.faster ? '-' : '+'}{comp.differenceStr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results Table */}
                {displayedResults.length > 0 && (
                  <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">
                        {showAllResults ? `All ${allResults.length} Runs` : 'Recent Runs'}
                      </h3>
                      {allResults.length > 10 && (
                        <button
                          onClick={() => setShowAllResults(!showAllResults)}
                          className="text-sm text-brand hover:text-brand/80 flex items-center gap-1 transition-colors"
                        >
                          {showAllResults ? (
                            <>
                              Show recent only
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              Show all {allResults.length} results
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-muted text-sm border-b border-border">
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Event</th>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedResults.map((result, i) => (
                            <tr key={i} className="border-b border-border/50 last:border-0">
                              <td className="px-6 py-3 text-muted">{result.runDate}</td>
                              <td className="px-6 py-3 text-foreground">{result.event}</td>
                              <td className="px-6 py-3">
                                <span className={`font-mono ${result.pb ? 'text-green-500 dark:text-green-400 font-bold' : 'text-foreground'}`}>
                                  {result.time}
                                  {result.pb && ' PB'}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-muted">{result.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Power of 10 Results */}
        {po10Data?.athlete && po10Data?.stats && (
          <section className="py-12">
            <div className="container">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Athlete Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface rounded-2xl border border-border p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{po10Data.athlete.name}</h2>
                      <div className="flex items-center gap-3 text-muted mt-1">
                        {po10Data.athlete.club && <span>{po10Data.athlete.club}</span>}
                        {po10Data.athlete.ageGroup && (
                          <>
                            <span className="text-border">•</span>
                            <span>{po10Data.athlete.ageGroup}</span>
                          </>
                        )}
                        {po10Data.athlete.gender && (
                          <>
                            <span className="text-border">•</span>
                            <span className="capitalize">{po10Data.athlete.gender}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getAbilityColor(po10Data.stats.overallAbilityLevel)}`}>
                      {po10Data.stats.overallAbilityLevel.charAt(0).toUpperCase() + po10Data.stats.overallAbilityLevel.slice(1)}
                    </span>
                  </div>

                  <p className="text-lg text-secondary">{po10Data.stats.ratingMessage}</p>

                  <div className="mt-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-brand" />
                    <span className="text-foreground font-semibold">Overall Percentile:</span>
                    <span className="text-brand font-mono">Top {Math.round(100 - po10Data.stats.overallPercentile)}%</span>
                  </div>
                </motion.div>

                {/* PBs by Distance */}
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Personal Bests</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {po10Data.stats.distances.map((dist) => (
                      <div key={dist.distance} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-24 text-muted">{dist.distanceName}</div>
                          <div className="font-mono text-xl text-foreground">{dist.time}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getAbilityColor(dist.abilityLevel)}`}>
                            {dist.abilityLevel}
                          </span>
                          <span className="text-muted text-sm w-24 text-right">
                            Top {Math.round(100 - dist.percentile)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {!isLoading && !error && !parkrunData && !po10Data && (
          <section className="py-16">
            <div className="container">
              <div className="max-w-md mx-auto text-center">
                <div className="w-20 h-20 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-muted" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Search for an Athlete</h3>
                <p className="text-muted">
                  Enter a {activeTab === 'parkrun' ? 'parkrun' : 'Power of 10'} athlete ID above to see
                  their performance analysis.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
      {LoginModal}
      <Footer />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
      {subValue && <p className="text-sm text-muted mt-1">{subValue}</p>}
    </div>
  );
}
