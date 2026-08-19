'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { RouteData } from '@/lib/route-comparison/types';
import { calculateTimeGaps } from '@/lib/route-comparison/analysis';
import { formatDistance, formatTimeDelta } from '@/lib/route-comparison/formatting';
import { niceAxisBounds, TIME_STEPS } from '@/lib/route-comparison/axis';

interface TimeGapChartProps {
  routes: RouteData[];
  selectedRouteIds: string[];
  referenceRouteId: string | null;
}

export default function TimeGapChart({ routes, selectedRouteIds, referenceRouteId }: TimeGapChartProps) {
  const visibleRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));
  const referenceRoute = visibleRoutes.find((r) => r.id === referenceRouteId);
  const comparisonRoutes = visibleRoutes.filter((r) => r.id !== referenceRouteId);

  const gapData = useMemo(() => {
    if (!referenceRoute || comparisonRoutes.length === 0) return null;
    return calculateTimeGaps(referenceRoute, comparisonRoutes, 0.1);
  }, [referenceRoute, comparisonRoutes]);

  const chartData = useMemo(() => {
    if (!gapData) return [];

    // Downsample for performance
    const step = Math.max(1, Math.floor(gapData.gaps.length / 300));
    return gapData.gaps
      .filter((_, i) => i % step === 0)
      .map((point) => {
        const row: Record<string, number | null> = {
          distance: Math.round(point.distance * 1000) / 1000,
        };
        for (const comp of point.comparisons) {
          row[comp.routeId] = Math.round(comp.gap * 10) / 10;
        }
        return row;
      });
  }, [gapData]);

  if (!referenceRoute) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Set a reference route to view time gaps</p>
      </div>
    );
  }

  if (comparisonRoutes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Select additional routes to compare</p>
      </div>
    );
  }

  if (!gapData || chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">No timing data available for gap analysis</p>
      </div>
    );
  }

  // Symmetric around zero on round numbers of seconds, so the labels read
  // 30s / 1:00 rather than thirds of whatever the biggest gap happened to be.
  const gaps = chartData.flatMap((row) =>
    Object.entries(row)
      .filter(([k]) => k !== 'distance')
      .map(([, v]) => v)
      .filter((v): v is number => typeof v === 'number' && isFinite(v))
  );
  const peak = gaps.length ? Math.max(30, ...gaps.map((g) => Math.abs(g))) : 30;
  const axis = niceAxisBounds(-peak, peak, {
    targetTicks: 6,
    snapZeroWithin: 0,
    stepLadder: TIME_STEPS,
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis
          dataKey="distance"
          tickFormatter={(v) => `${v.toFixed(1)}`}
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          label={{ value: 'Distance (km)', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#a1a1aa' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          tickFormatter={(v) => formatTimeDelta(v)}
          label={{ value: `Gap vs ${referenceRoute.displayName}`, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#a1a1aa' }}
          domain={[axis.min, axis.max]}
          ticks={axis.ticks}
        />
        <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const dist = typeof label === 'number' ? label : parseFloat(String(label));
            return (
              <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
                <p className="text-xs text-zinc-500 mb-1">{formatDistance(dist)}</p>
                <p className="text-xs text-zinc-400 mb-1">vs {referenceRoute.displayName}</p>
                {payload.map((entry) => {
                  const route = comparisonRoutes.find((r) => r.id === entry.dataKey);
                  if (!route || entry.value === null || entry.value === undefined) return null;
                  const gap = entry.value as number;
                  return (
                    <p key={entry.dataKey} className="text-xs font-medium" style={{ color: entry.color }}>
                      {route.displayName}: {formatTimeDelta(gap)}
                      {gap > 0 ? ' behind' : gap < 0 ? ' ahead' : ' even'}
                    </p>
                  );
                })}
              </div>
            );
          }}
        />
        {comparisonRoutes.length > 1 && (
          <Legend
            formatter={(value) => {
              const route = comparisonRoutes.find((r) => r.id === value);
              return <span className="text-xs">{route?.displayName || value}</span>;
            }}
          />
        )}
        {comparisonRoutes.map((route) => (
          <Line
            key={route.id}
            type="monotone"
            dataKey={route.id}
            stroke={route.color}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
