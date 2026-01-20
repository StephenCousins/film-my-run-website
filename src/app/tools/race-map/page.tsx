'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Map,
  Mountain,
  Upload,
  Play,
  Pause,
  ChevronRight,
  TrendingUp,
  Clock,
  Navigation,
  Maximize2,
  Download,
  Share2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ============================================
// SAMPLE DATA
// ============================================

const sampleRouteStats = {
  distance: '42.195',
  elevation: '+1,234m',
  maxElevation: '847m',
  minElevation: '12m',
  estimatedTime: '4:15:00',
};

const sampleMarkers = [
  { km: 0, label: 'Start', elevation: 45 },
  { km: 5, label: '5K', elevation: 123 },
  { km: 10, label: '10K', elevation: 234 },
  { km: 15, label: '15K', elevation: 456 },
  { km: 21.1, label: 'Half', elevation: 567 },
  { km: 25, label: '25K', elevation: 678 },
  { km: 30, label: '30K', elevation: 789 },
  { km: 35, label: '35K', elevation: 654 },
  { km: 40, label: '40K', elevation: 321 },
  { km: 42.2, label: 'Finish', elevation: 45 },
];

// ============================================
// RACE MAP PAGE
// ============================================

export default function RaceMapPage() {
  const [hasRoute, setHasRoute] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate file processing
      setTimeout(() => {
        setHasRoute(true);
      }, 1000);
    }
  };

  const handleDemoLoad = () => {
    setHasRoute(true);
  };

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Hero */}
        <section className="py-12 lg:py-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="container">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
                <Map className="w-4 h-4" />
                Visualization Tool
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
                Race Map
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                Visualize race routes with elevation profiles, distance markers, and key waypoints.
                Upload a GPX file or explore a sample route.
              </p>
            </div>
          </div>
        </section>

        {!hasRoute ? (
          // Upload section
          <section className="py-16 lg:py-24">
            <div className="container">
              <div className="max-w-xl mx-auto">
                {/* Upload area */}
                <label className="block cursor-pointer group">
                  <input
                    type="file"
                    accept=".gpx,.tcx,.fit"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 text-center hover:border-orange-500 dark:hover:border-orange-500 transition-colors group-hover:bg-orange-500/5">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500/10 transition-colors">
                      <Upload className="w-8 h-8 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      Upload Route File
                    </h3>
                    <p className="text-zinc-500 mb-4">
                      Drag and drop a GPX, TCX, or FIT file here, or click to browse
                    </p>
                    <p className="text-sm text-zinc-400">Max file size: 10MB</p>
                  </div>
                </label>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-sm text-zinc-500 bg-zinc-50 dark:bg-zinc-950">
                      or try a demo
                    </span>
                  </div>
                </div>

                {/* Demo buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleDemoLoad}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 transition-colors text-left group"
                  >
                    <Mountain className="w-6 h-6 text-orange-500 mb-2" />
                    <div className="font-semibold text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors">
                      London Marathon
                    </div>
                    <div className="text-sm text-zinc-500">42.2km • +50m</div>
                  </button>
                  <button
                    onClick={handleDemoLoad}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 transition-colors text-left group"
                  >
                    <Mountain className="w-6 h-6 text-orange-500 mb-2" />
                    <div className="font-semibold text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors">
                      UTMB
                    </div>
                    <div className="text-sm text-zinc-500">171km • +10,000m</div>
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          // Map section
          <section className="py-8 lg:py-12">
            <div className="container">
              <div className="grid lg:grid-cols-4 gap-8">
                {/* Map area */}
                <div className="lg:col-span-3">
                  {/* Map placeholder */}
                  <div className="relative aspect-[16/9] bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden mb-6">
                    {/* This would be the actual map */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Map className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
                        <p className="text-zinc-500">Interactive map would render here</p>
                        <p className="text-sm text-zinc-400">Using Mapbox or Leaflet</p>
                      </div>
                    </div>

                    {/* Map controls */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <button className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <Maximize2 className="w-5 h-5" />
                      </button>
                      <button className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <Navigation className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Elevation profile */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-bold text-zinc-900 dark:text-white">
                        Elevation Profile
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Simple elevation viz */}
                    <div className="relative h-32 bg-zinc-50 dark:bg-zinc-800 rounded-lg overflow-hidden">
                      {/* Elevation line (simplified) */}
                      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        <path
                          d="M0,100 C50,80 100,60 150,40 C200,20 250,30 300,50 C350,70 400,60 450,45 C500,30 550,50 600,70 C650,90 700,85 750,100"
                          fill="url(#gradient)"
                          className="opacity-50"
                        />
                        <path
                          d="M0,100 C50,80 100,60 150,40 C200,20 250,30 300,50 C350,70 400,60 450,45 C500,30 550,50 600,70 C650,90 700,85 750,100"
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="2"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Markers */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                        {sampleMarkers
                          .filter((_, i) => i % 2 === 0)
                          .map((marker) => (
                            <button
                              key={marker.km}
                              onClick={() => setSelectedMarker(marker.km)}
                              className={cn(
                                'text-xs px-1 py-0.5 rounded transition-colors',
                                selectedMarker === marker.km
                                  ? 'bg-orange-500 text-white'
                                  : 'text-zinc-500 hover:text-orange-500'
                              )}
                            >
                              {marker.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Route stats */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <h3 className="font-display font-bold text-zinc-900 dark:text-white mb-4">
                      Route Stats
                    </h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-zinc-500 flex items-center gap-2">
                          <Navigation className="w-4 h-4" />
                          Distance
                        </dt>
                        <dd className="font-mono font-bold text-zinc-900 dark:text-white">
                          {sampleRouteStats.distance}km
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Elevation Gain
                        </dt>
                        <dd className="font-mono font-bold text-zinc-900 dark:text-white">
                          {sampleRouteStats.elevation}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500 flex items-center gap-2">
                          <Mountain className="w-4 h-4" />
                          Max Elevation
                        </dt>
                        <dd className="font-mono font-bold text-zinc-900 dark:text-white">
                          {sampleRouteStats.maxElevation}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Est. Time
                        </dt>
                        <dd className="font-mono font-bold text-zinc-900 dark:text-white">
                          {sampleRouteStats.estimatedTime}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Actions */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <h3 className="font-display font-bold text-zinc-900 dark:text-white mb-4">
                      Actions
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors">
                        <Download className="w-5 h-5" />
                        Download GPX
                      </button>
                      <button className="w-full flex items-center justify-center gap-2 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-orange-500 transition-colors">
                        <Share2 className="w-5 h-5" />
                        Share Route
                      </button>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <h3 className="font-display font-bold text-zinc-900 dark:text-white mb-4">
                      More Tools
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/tools/calculators"
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300 group-hover:text-orange-500">
                          Pace Calculator
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-orange-500" />
                      </Link>
                      <Link
                        href="/tools/parkrun"
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300 group-hover:text-orange-500">
                          parkrun Stats
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-orange-500" />
                      </Link>
                    </div>
                  </div>

                  {/* New route button */}
                  <button
                    onClick={() => setHasRoute(false)}
                    className="w-full py-3 text-zinc-500 hover:text-orange-500 transition-colors text-sm"
                  >
                    Upload a different route
                  </button>
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
