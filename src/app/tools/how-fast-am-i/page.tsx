'use client';

import { useState } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

type Tab = 'parkrun' | 'po10';

interface ParkrunResult {
  event: string;
  runDate: string;
  time: string;
  timeSeconds: number;
  position: string;
  pb: boolean;
}

interface ParkrunData {
  ok: boolean;
  cached?: boolean;
  stale?: boolean;
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
  const [activeTab, setActiveTab] = useState<Tab>('parkrun');
  const [athleteId, setAthleteId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parkrunData, setParkrunData] = useState<ParkrunData | null>(null);
  const [po10Data, setPo10Data] = useState<Po10Data | null>(null);

  const handleSearch = async () => {
    if (!athleteId.trim()) {
      setError('Please enter an athlete ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = activeTab === 'parkrun'
        ? `/api/how-fast/parkrun?id=${athleteId.trim()}`
        : `/api/how-fast/po10?id=${athleteId.trim()}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to fetch data');
        if (activeTab === 'parkrun') setParkrunData(null);
        else setPo10Data(null);
      } else {
        if (activeTab === 'parkrun') {
          setParkrunData(data);
          setPo10Data(null);
        } else {
          setPo10Data(data);
          setParkrunData(null);
        }
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-zinc-500" />;
    }
  };

  const getAbilityColor = (level: string) => {
    switch (level) {
      case 'elite':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'advanced':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'intermediate':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'novice':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    }
  };

  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
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
              <source src="/videos/fast-running.webm" type="video/webm" />
              <source src="/videos/fast-running.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/70 to-zinc-950" />
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
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 sm:p-8">
                {/* Tabs */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex bg-zinc-800 rounded-xl p-1">
                    <button
                      onClick={() => { setActiveTab('parkrun'); setError(null); }}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'parkrun'
                          ? 'bg-orange-500 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      parkrun
                    </button>
                    <button
                      onClick={() => { setActiveTab('po10'); setError(null); }}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'po10'
                          ? 'bg-orange-500 text-white'
                          : 'text-zinc-400 hover:text-white'
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
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder={activeTab === 'parkrun' ? 'Enter parkrun ID (e.g., 123456)' : 'Enter Power of 10 ID'}
                      className="w-full px-4 py-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="px-6 py-3.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

                {/* Help text */}
                <p className="text-sm text-zinc-500 mt-4 flex items-center justify-center gap-1">
                  <Info className="w-4 h-4" />
                  {activeTab === 'parkrun'
                    ? 'Find your ID on your parkrun profile page'
                    : 'Find your ID on thepowerof10.info'}
                </p>
              </div>
            </div>
          </div>
        </section>

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
                  className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{parkrunData.athlete.name}</h2>
                      <p className="text-zinc-400">parkrun ID: {parkrunData.athlete.athleteId}</p>
                    </div>
                    {parkrunData.comparison && (
                      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getAbilityColor(parkrunData.comparison.abilityLevel)}`}>
                        {parkrunData.comparison.abilityLevel.charAt(0).toUpperCase() + parkrunData.comparison.abilityLevel.slice(1)}
                      </span>
                    )}
                  </div>

                  {parkrunData.comparison && (
                    <p className="text-lg text-zinc-300">{parkrunData.comparison.ratingMessage}</p>
                  )}

                  {parkrunData.stale && parkrunData.warning && (
                    <div className="mt-4 text-sm text-yellow-400 bg-yellow-500/10 rounded-lg px-4 py-2">
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
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        {getTrendIcon(parkrunData.athlete.stats.trend)}
                        <h3 className="text-lg font-semibold text-white">Performance Trend</h3>
                      </div>
                      <p className="text-zinc-400">{parkrunData.athlete.stats.trendMessage}</p>
                      {parkrunData.athlete.stats.recentAvgTime && (
                        <p className="text-sm text-zinc-500 mt-2">
                          Recent average: {parkrunData.athlete.stats.recentAvgTime}
                        </p>
                      )}
                    </div>

                    {parkrunData.athlete.stats.avgAgeGrade && (
                      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <Users className="w-5 h-5 text-orange-500" />
                          <h3 className="text-lg font-semibold text-white">Age Grading</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-white">{parkrunData.athlete.stats.avgAgeGrade}%</span>
                          <span className="text-zinc-500">average</span>
                        </div>
                        {parkrunData.athlete.stats.recentAvgAgeGrade && (
                          <p className="text-sm text-zinc-500 mt-2">
                            Recent: {parkrunData.athlete.stats.recentAvgAgeGrade}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Comparisons */}
                {parkrunData.comparison && (
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">How You Compare</h3>
                    <div className="space-y-3">
                      {parkrunData.comparison.parkrunComparisons.map((comp, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                          <div>
                            <p className="text-white">{comp.name}</p>
                            <p className="text-sm text-zinc-500">{comp.benchmarkTime}</p>
                          </div>
                          <span className={`font-mono ${comp.faster ? 'text-green-400' : 'text-red-400'}`}>
                            {comp.faster ? '-' : '+'}{comp.differenceStr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Results */}
                {parkrunData.athlete.recentResults && parkrunData.athlete.recentResults.length > 0 && (
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800">
                      <h3 className="text-lg font-semibold text-white">Recent Runs</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Event</th>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parkrunData.athlete.recentResults.map((result, i) => (
                            <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                              <td className="px-6 py-3 text-zinc-400">{result.runDate}</td>
                              <td className="px-6 py-3 text-white">{result.event}</td>
                              <td className="px-6 py-3">
                                <span className={`font-mono ${result.pb ? 'text-green-400 font-bold' : 'text-white'}`}>
                                  {result.time}
                                  {result.pb && ' PB'}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-zinc-400">{result.position}</td>
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
                  className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{po10Data.athlete.name}</h2>
                      <div className="flex items-center gap-3 text-zinc-400 mt-1">
                        {po10Data.athlete.club && <span>{po10Data.athlete.club}</span>}
                        {po10Data.athlete.ageGroup && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span>{po10Data.athlete.ageGroup}</span>
                          </>
                        )}
                        {po10Data.athlete.gender && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="capitalize">{po10Data.athlete.gender}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getAbilityColor(po10Data.stats.overallAbilityLevel)}`}>
                      {po10Data.stats.overallAbilityLevel.charAt(0).toUpperCase() + po10Data.stats.overallAbilityLevel.slice(1)}
                    </span>
                  </div>

                  <p className="text-lg text-zinc-300">{po10Data.stats.ratingMessage}</p>

                  <div className="mt-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-orange-500" />
                    <span className="text-white font-semibold">Overall Percentile:</span>
                    <span className="text-orange-400 font-mono">Top {Math.round(100 - po10Data.stats.overallPercentile)}%</span>
                  </div>
                </motion.div>

                {/* PBs by Distance */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800">
                    <h3 className="text-lg font-semibold text-white">Personal Bests</h3>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {po10Data.stats.distances.map((dist) => (
                      <div key={dist.distance} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-24 text-zinc-400">{dist.distanceName}</div>
                          <div className="font-mono text-xl text-white">{dist.time}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getAbilityColor(dist.abilityLevel)}`}>
                            {dist.abilityLevel}
                          </span>
                          <span className="text-zinc-400 text-sm w-24 text-right">
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
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Search for an Athlete</h3>
                <p className="text-zinc-400">
                  Enter a {activeTab === 'parkrun' ? 'parkrun' : 'Power of 10'} athlete ID above to see
                  their performance analysis.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
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
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      {subValue && <p className="text-sm text-zinc-500 mt-1">{subValue}</p>}
    </div>
  );
}
