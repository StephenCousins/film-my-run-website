'use client';

import { useAuth } from '@/contexts/AuthContext';
import { RouteComparisonProvider, useRouteComparison } from '@/contexts/RouteComparisonContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import RouteList from '@/components/route-comparison/RouteList';
import FileDropZone from '@/components/route-comparison/FileDropZone';
import LoginPrompt from '@/components/route-comparison/LoginPrompt';
import { formatDistance, formatDuration, formatElevation, formatPace } from '@/lib/route-comparison';
import { MapPin, Clock, TrendingUp, Gauge, Loader2 } from 'lucide-react';

function RouteComparisonContent() {
  const { routes, selectedRouteIds, referenceRouteId } = useRouteComparison();

  const selectedRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));
  const referenceRoute = routes.find((r) => r.id === referenceRouteId);

  if (routes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <h2 className="text-xl font-display font-semibold text-zinc-900 dark:text-white mb-2">
              Get Started
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Upload your GPX or FIT files to compare routes, analyze splits, and
              view elevation profiles.
            </p>
          </div>
          <FileDropZone />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
        <RouteList />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {selectedRoutes.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                Select a route from the sidebar to view details
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={MapPin}
                label="Total Distance"
                value={formatDistance(
                  selectedRoutes.reduce((sum, r) => sum + r.stats.distance, 0) /
                    selectedRoutes.length
                )}
                subtitle={`Avg of ${selectedRoutes.length} routes`}
              />
              <StatCard
                icon={Clock}
                label="Avg Duration"
                value={formatDuration(
                  selectedRoutes.reduce(
                    (sum, r) => sum + (r.stats.duration || 0),
                    0
                  ) / selectedRoutes.filter((r) => r.stats.duration).length || null
                )}
                subtitle="Moving time"
              />
              <StatCard
                icon={TrendingUp}
                label="Avg Elev. Gain"
                value={formatElevation(
                  selectedRoutes.reduce((sum, r) => sum + r.stats.elevationGain, 0) /
                    selectedRoutes.length
                )}
                subtitle="Total climbing"
              />
              <StatCard
                icon={Gauge}
                label="Avg Pace"
                value={(() => {
                  const paces = selectedRoutes.flatMap((r) =>
                    r.paces.filter((p): p is number => p !== null && p > 0 && p < 20)
                  );
                  return paces.length > 0
                    ? formatPace(paces.reduce((a, b) => a + b, 0) / paces.length)
                    : 'N/A';
                })()}
                subtitle="Overall pace"
              />
            </div>

            {/* Routes comparison table */}
            <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                <h3 className="font-display font-semibold text-zinc-900 dark:text-white">
                  Route Comparison
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Distance
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Elev. Gain
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Avg Pace
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {selectedRoutes.map((route) => {
                      const validPaces = route.paces.filter(
                        (p): p is number => p !== null && p > 0 && p < 20
                      );
                      const avgPace =
                        validPaces.length > 0
                          ? validPaces.reduce((a, b) => a + b, 0) / validPaces.length
                          : null;

                      return (
                        <tr
                          key={route.id}
                          className={
                            route.id === referenceRouteId
                              ? 'bg-orange-50 dark:bg-orange-900/10'
                              : ''
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: route.color }}
                              />
                              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                {route.displayName}
                              </span>
                              {route.id === referenceRouteId && (
                                <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded">
                                  REF
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                            {formatDistance(route.stats.distance)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                            {formatDuration(route.stats.duration)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                            {formatElevation(route.stats.elevationGain)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                            {formatPace(avgPace)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Placeholder for map and charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                <h3 className="font-display font-semibold text-zinc-900 dark:text-white mb-4">
                  Map View
                </h3>
                <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                  <p className="text-zinc-500 text-sm">
                    Map component coming soon
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                <h3 className="font-display font-semibold text-zinc-900 dark:text-white mb-4">
                  Elevation Profile
                </h3>
                <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                  <p className="text-zinc-500 text-sm">
                    Elevation chart coming soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-orange-500" />
        <span className="text-xs text-zinc-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xl font-display font-bold text-zinc-900 dark:text-white">
        {value}
      </p>
      <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
    </div>
  );
}

export default function RouteComparisonPage() {
  const { status, hasAccess } = useAuth();

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 bg-white dark:bg-zinc-950">
        <div className="container py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold text-zinc-900 dark:text-white">
              Route Comparison
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Compare your running routes, analyze splits, and track your progress
            </p>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : !hasAccess('FREE') ? (
          <LoginPrompt feature="Route Comparison" />
        ) : (
          <div className="container pb-8">
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 min-h-[600px] flex flex-col">
              <RouteComparisonProvider>
                <RouteComparisonContent />
              </RouteComparisonProvider>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
