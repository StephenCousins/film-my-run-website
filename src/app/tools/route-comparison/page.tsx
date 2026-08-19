'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RouteComparisonProvider, useRouteComparison } from '@/contexts/RouteComparisonContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import RouteList from '@/components/route-comparison/RouteList';
import FileDropZone from '@/components/route-comparison/FileDropZone';
import LoginPrompt from '@/components/route-comparison/LoginPrompt';
import RouteMap from '@/components/route-comparison/RouteMap';
import ElevationChart from '@/components/route-comparison/ElevationChart';
import MetricChart from '@/components/route-comparison/MetricChart';
import { availableMetrics, type MetricType } from '@/components/route-comparison/MetricChart';
import SplitsTable from '@/components/route-comparison/SplitsTable';
import InsightsPanel from '@/components/route-comparison/InsightsPanel';
import TimeGapChart from '@/components/route-comparison/TimeGapChart';
import SegmentAnalysis from '@/components/route-comparison/SegmentAnalysis';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSplitPace,
} from '@/lib/route-comparison';
import { calculateSplits } from '@/lib/route-comparison/analysis';
import {
  MapPin,
  Clock,
  TrendingUp,
  Gauge,
  Loader2,
  Download,
  Map,
  BarChart3,
  Timer,
  Zap,
  Scissors,
  Activity,
} from 'lucide-react';

type Tab = 'overview' | 'charts' | 'splits' | 'gaps' | 'segments' | 'insights';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Map },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'splits', label: 'Splits', icon: Timer },
  { id: 'gaps', label: 'Time Gaps', icon: Activity },
  { id: 'segments', label: 'Segments', icon: Scissors },
  { id: 'insights', label: 'Insights', icon: Zap },
];

const METRIC_OPTIONS: { id: MetricType; label: string }[] = [
  { id: 'pace', label: 'Pace' },
  { id: 'speed', label: 'Speed' },
  { id: 'heartRate', label: 'Heart Rate' },
  { id: 'cadence', label: 'Cadence' },
  { id: 'power', label: 'Power' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'battery', label: 'Battery' },
  { id: 'gpsAccuracy', label: 'GPS Accuracy' },
];

function RouteComparisonContent() {
  const { routes, selectedRouteIds, referenceRouteId } = useRouteComparison();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('pace');

  const selectedRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));
  const referenceRoute = routes.find((r) => r.id === referenceRouteId);

  // CSV export
  const handleExportCSV = useCallback(() => {
    if (selectedRoutes.length === 0) return;

    const rows: string[][] = [];
    // Header
    rows.push(['Route', 'Distance (km)', 'Duration (s)', 'Elev Gain (m)', 'Elev Loss (m)', 'Avg Pace (min/km)']);

    for (const route of selectedRoutes) {
      const validPaces = route.paces.filter((p): p is number => p !== null && p > 0 && p < 20);
      const avgPace = validPaces.length > 0 ? validPaces.reduce((a, b) => a + b, 0) / validPaces.length : null;

      rows.push([
        route.displayName,
        route.stats.distance.toFixed(3),
        route.stats.duration?.toFixed(0) || '',
        route.stats.elevationGain.toFixed(0),
        route.stats.elevationLoss.toFixed(0),
        avgPace?.toFixed(2) || '',
      ]);
    }

    // Add splits
    rows.push([]);
    rows.push(['Splits (1km)']);
    const splitHeader = ['Split'];
    for (const route of selectedRoutes) {
      splitHeader.push(`${route.displayName} Pace`);
      splitHeader.push(`${route.displayName} Time (s)`);
    }
    rows.push(splitHeader);

    const allSplits = selectedRoutes.map((r) => calculateSplits(r));
    const maxSplits = Math.max(...allSplits.map((s) => s.length));

    for (let i = 0; i < maxSplits; i++) {
      const row = [(i + 1).toString()];
      for (let j = 0; j < selectedRoutes.length; j++) {
        const split = allSplits[j][i];
        row.push(split?.pace ? formatSplitPace(split.pace) : '');
        row.push(split?.duration?.toFixed(0) || '');
      }
      rows.push(row);
    }

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedRoutes]);

  if (routes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <h2 className="text-xl font-display font-semibold text-foreground mb-2">
              Get Started
            </h2>
            <p className="text-muted">
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
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-surface-secondary">
        <RouteList />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedRoutes.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <p className="text-muted">
              Select a route from the sidebar to view details
            </p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex items-center border-b border-border bg-surface px-4 overflow-x-auto">
              <div className="flex items-center gap-1 flex-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-brand text-brand'
                        : 'border-transparent text-muted hover:text-secondary'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted hover:text-secondary hover:bg-surface-secondary rounded-lg transition-colors ml-2"
                title="Export to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <OverviewTab
                  routes={routes}
                  selectedRoutes={selectedRoutes}
                  selectedRouteIds={selectedRouteIds}
                  referenceRouteId={referenceRouteId}
                />
              )}

              {activeTab === 'charts' && (
                <ChartsTab
                  routes={routes}
                  selectedRouteIds={selectedRouteIds}
                  selectedMetric={selectedMetric}
                  setSelectedMetric={setSelectedMetric}
                />
              )}

              {activeTab === 'splits' && (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-display font-semibold text-foreground">
                      1km Splits
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      Pace per kilometre{referenceRoute ? ` — gaps vs ${referenceRoute.displayName}` : ''}
                    </p>
                  </div>
                  <SplitsTable
                    routes={routes}
                    selectedRouteIds={selectedRouteIds}
                    referenceRouteId={referenceRouteId}
                  />
                </div>
              )}

              {activeTab === 'gaps' && (
                <div className="space-y-6">
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <h3 className="font-display font-semibold text-foreground mb-1">
                      Time Gap Analysis
                    </h3>
                    <p className="text-xs text-muted mb-4">
                      Time difference vs reference route at each distance point.
                      {referenceRoute
                        ? ` Reference: ${referenceRoute.displayName}`
                        : ' Set a reference route in the sidebar.'}
                    </p>
                    <div className="h-[350px]">
                      <TimeGapChart
                        routes={routes}
                        selectedRouteIds={selectedRouteIds}
                        referenceRouteId={referenceRouteId}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'segments' && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    Segment Analysis
                  </h3>
                  <p className="text-xs text-muted mb-4">
                    Compare specific distance ranges across routes
                  </p>
                  <SegmentAnalysis
                    routes={routes}
                    selectedRouteIds={selectedRouteIds}
                  />
                </div>
              )}

              {activeTab === 'insights' && (
                <InsightsTab selectedRoutes={selectedRoutes} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  routes,
  selectedRoutes,
  selectedRouteIds,
  referenceRouteId,
}: {
  routes: import('@/lib/route-comparison/types').RouteData[];
  selectedRoutes: import('@/lib/route-comparison/types').RouteData[];
  selectedRouteIds: string[];
  referenceRouteId: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={MapPin}
          label="Avg Distance"
          value={formatDistance(
            selectedRoutes.reduce((sum, r) => sum + r.stats.distance, 0) /
              selectedRoutes.length
          )}
          subtitle={`${selectedRoutes.length} route${selectedRoutes.length !== 1 ? 's' : ''}`}
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

      {/* Map — full width. The elevation profile lives on the Charts tab. */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="font-display font-semibold text-foreground mb-3">
          Map View
        </h3>
        <div className="h-[350px] rounded-lg overflow-hidden">
          <RouteMap
            routes={routes}
            selectedRouteIds={selectedRouteIds}
            referenceRouteId={referenceRouteId}
          />
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">
            Route Comparison
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Route
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  Elev. Gain
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  Avg Pace
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
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
                        ? 'bg-brand-muted'
                        : ''
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: route.color }}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {route.displayName}
                        </span>
                        {route.id === referenceRouteId && (
                          <span className="px-1.5 py-0.5 bg-brand-muted text-brand text-xs font-medium rounded">
                            REF
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {formatDistance(route.stats.distance)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {formatDuration(route.stats.duration)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {formatElevation(route.stats.elevationGain)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted">
                      {formatPace(avgPace)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChartsTab({
  routes,
  selectedRouteIds,
  selectedMetric,
  setSelectedMetric,
}: {
  routes: import('@/lib/route-comparison/types').RouteData[];
  selectedRouteIds: string[];
  selectedMetric: MetricType;
  setSelectedMetric: (m: MetricType) => void;
}) {
  // Only offer metrics the loaded files actually carry — a Garmin FIT brings
  // temperature and GPS accuracy, a bare GPX brings none of them.
  const visible = routes.filter((r) => selectedRouteIds.includes(r.id));
  const present = new Set(availableMetrics(visible));
  const shownMetrics = METRIC_OPTIONS.filter((o) => present.has(o.id));

  return (
    <div className="space-y-6">
      {/* Elevation */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="font-display font-semibold text-foreground mb-3">
          Elevation Profile
        </h3>
        <div className="h-[300px]">
          <ElevationChart routes={routes} selectedRouteIds={selectedRouteIds} />
        </div>
      </div>

      {/* Metric chart with selector */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground">
            Metric Comparison
          </h3>
          <div className="flex gap-1 flex-wrap justify-end">
            {shownMetrics.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedMetric(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  selectedMetric === opt.id
                    ? 'bg-brand-muted text-brand'
                    : 'text-muted hover:bg-surface-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[300px]">
          <MetricChart
            routes={routes}
            selectedRouteIds={selectedRouteIds}
            metric={selectedMetric}
          />
        </div>
      </div>
    </div>
  );
}

function InsightsTab({ selectedRoutes }: { selectedRoutes: import('@/lib/route-comparison/types').RouteData[] }) {
  const [selectedInsightRouteIdx, setSelectedInsightRouteIdx] = useState(0);
  const insightRoute = selectedRoutes[selectedInsightRouteIdx] || selectedRoutes[0];

  if (!insightRoute) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted text-sm">Select a route to view insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Route selector */}
      {selectedRoutes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {selectedRoutes.map((route, idx) => (
            <button
              key={route.id}
              onClick={() => setSelectedInsightRouteIdx(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                idx === selectedInsightRouteIdx
                  ? 'border-brand bg-brand-muted text-brand'
                  : 'border-border text-muted hover:bg-surface-secondary'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: route.color }}
              />
              {route.displayName}
            </button>
          ))}
        </div>
      )}

      <InsightsPanel route={insightRoute} />
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
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-brand" />
        <span className="text-xs text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xl font-display font-bold text-foreground">
        {value}
      </p>
      <p className="text-xs text-muted mt-1">{subtitle}</p>
    </div>
  );
}

export default function RouteComparisonPage() {
  const { status, hasAccess } = useAuth();

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 bg-background">
        <div className="container py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold text-foreground">
              Route Comparison
            </h1>
            <p className="text-muted mt-1">
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
            <div className="bg-surface-secondary rounded-xl border border-border min-h-[600px] flex flex-col">
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
