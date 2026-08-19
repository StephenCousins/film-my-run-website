'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RouteData, ChartDataPoint } from '@/lib/route-comparison/types';
import { buildCumulativeDistances } from '@/lib/route-comparison/gps';
import { formatElevation, formatDistance } from '@/lib/route-comparison/formatting';
import { decimateData } from '@/lib/route-comparison/stats';
import { niceAxisBounds, axisOptionsFor } from '@/lib/route-comparison/axis';

interface ElevationChartProps {
  routes: RouteData[];
  selectedRouteIds: string[];
}

export default function ElevationChart({ routes, selectedRouteIds }: ElevationChartProps) {
  const visibleRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));

  const chartData = useMemo(() => {
    if (visibleRoutes.length === 0) return [];

    // Build distance-indexed elevation data for each route
    const routeDistElev: { distances: number[]; elevations: (number | null)[] }[] = [];
    let maxDistance = 0;

    for (const route of visibleRoutes) {
      const distances = buildCumulativeDistances(route.coordinates);
      const totalDist = distances[distances.length - 1];
      if (totalDist > maxDistance) maxDistance = totalDist;
      routeDistElev.push({ distances, elevations: route.elevations });
    }

    // Sample at regular intervals
    const sampleCount = Math.min(500, Math.max(100, Math.round(maxDistance * 50)));
    const interval = maxDistance / sampleCount;
    const data: ChartDataPoint[] = [];

    for (let d = 0; d <= maxDistance; d += interval) {
      const point: ChartDataPoint = { distance: Math.round(d * 1000) / 1000 };

      for (let i = 0; i < visibleRoutes.length; i++) {
        const { distances, elevations } = routeDistElev[i];
        const route = visibleRoutes[i];

        if (d > distances[distances.length - 1]) {
          point[route.id] = null;
          continue;
        }

        // Find index via binary search
        let low = 0;
        let high = distances.length - 1;
        while (low < high - 1) {
          const mid = Math.floor((low + high) / 2);
          if (distances[mid] <= d) low = mid;
          else high = mid;
        }

        const elev = elevations[low];
        point[route.id] = elev !== null && elev !== undefined ? Math.round(elev * 10) / 10 : null;
      }

      data.push(point);
    }

    return data;
  }, [visibleRoutes]);

  if (visibleRoutes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Select routes to view elevation profiles</p>
      </div>
    );
  }

  const plotted = chartData.flatMap((row) =>
    selectedRouteIds
      .map((id) => row[id])
      .filter((v): v is number => typeof v === 'number' && isFinite(v))
  );
  const axis = plotted.length
    ? niceAxisBounds(Math.min(...plotted), Math.max(...plotted), axisOptionsFor('elevation'))
    : null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis
          dataKey="distance"
          tickFormatter={(v) => `${v.toFixed(1)}`}
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          label={{ value: 'Distance (km)', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#a1a1aa' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#a1a1aa' }}
          domain={axis ? [axis.min, axis.max] : ['auto', 'auto']}
          ticks={axis ? axis.ticks : undefined}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const dist = typeof label === 'number' ? label : parseFloat(String(label));
            return (
              <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
                <p className="text-xs text-zinc-500 mb-1">{formatDistance(dist)}</p>
                {payload.map((entry) => {
                  const route = visibleRoutes.find((r) => r.id === entry.dataKey);
                  if (!route || entry.value === null || entry.value === undefined) return null;
                  return (
                    <p key={entry.dataKey} className="text-xs font-medium" style={{ color: entry.color }}>
                      {route.displayName}: {formatElevation(entry.value as number)}
                    </p>
                  );
                })}
              </div>
            );
          }}
        />
        {visibleRoutes.length > 1 && (
          <Legend
            formatter={(value) => {
              const route = visibleRoutes.find((r) => r.id === value);
              return <span className="text-xs">{route?.displayName || value}</span>;
            }}
          />
        )}
        {visibleRoutes.map((route, i) => (
          <Area
            key={route.id}
            type="monotone"
            dataKey={route.id}
            stroke={route.color}
            fill={route.color}
            fillOpacity={visibleRoutes.length === 1 ? 0.3 : 0.1}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
