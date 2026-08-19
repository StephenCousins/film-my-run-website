'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RouteData, ChartDataPoint } from '@/lib/route-comparison/types';
import { buildCumulativeDistances } from '@/lib/route-comparison/gps';
import { formatDistance } from '@/lib/route-comparison/formatting';
import { niceAxisBounds, axisOptionsFor } from '@/lib/route-comparison/axis';

export type MetricType =
  | 'pace' | 'speed' | 'heartRate' | 'cadence' | 'power'
  | 'temperature' | 'battery' | 'gpsAccuracy';

interface MetricChartProps {
  routes: RouteData[];
  selectedRouteIds: string[];
  metric: MetricType;
}

const METRIC_CONFIG: Record<MetricType, {
  label: string;
  unit: string;
  getValues: (route: RouteData) => (number | null)[];
  formatValue: (v: number) => string;
  domain?: [string | number, string | number];
  reversed?: boolean;
}> = {
  pace: {
    label: 'Pace',
    unit: 'min/km',
    getValues: (r) => r.paces,
    formatValue: (v) => {
      const mins = Math.floor(v);
      const secs = Math.round((v - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    reversed: true,
  },
  speed: {
    label: 'Speed',
    unit: 'km/h',
    getValues: (r) => r.speeds,
    formatValue: (v) => `${v.toFixed(1)}`,
  },
  heartRate: {
    label: 'Heart Rate',
    unit: 'bpm',
    getValues: (r) => r.heartRates,
    formatValue: (v) => `${Math.round(v)}`,
  },
  cadence: {
    label: 'Cadence',
    unit: 'spm',
    getValues: (r) => r.cadences,
    formatValue: (v) => `${Math.round(v)}`,
  },
  power: {
    label: 'Power',
    unit: 'W',
    getValues: (r) => r.powers,
    formatValue: (v) => `${Math.round(v)}`,
  },
  temperature: {
    label: 'Temperature',
    unit: '\u00B0C',
    getValues: (r) => r.temperatures ?? [],
    formatValue: (v) => `${Math.round(v)}`,
  },
  battery: {
    label: 'Battery',
    unit: '%',
    getValues: (r) => r.batteryLevels ?? [],
    formatValue: (v) => `${Math.round(v)}`,
  },
  gpsAccuracy: {
    label: 'GPS Accuracy',
    unit: 'm',
    getValues: (r) => r.gpsAccuracies ?? [],
    formatValue: (v) => `${v.toFixed(1)}`,
  },
};

/** Which metrics any of these routes actually carry data for. */
export function availableMetrics(routes: RouteData[]): MetricType[] {
  return (Object.keys(METRIC_CONFIG) as MetricType[]).filter((m) =>
    routes.some((r) => METRIC_CONFIG[m].getValues(r).some((v) => v !== null && v > 0))
  );
}

export default function MetricChart({ routes, selectedRouteIds, metric }: MetricChartProps) {
  const config = METRIC_CONFIG[metric];
  const allowsNonPositive = metric === 'temperature';
  const visibleRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));

  // Check if any visible route has data for this metric
  const routesWithData = visibleRoutes.filter((r) => {
    const values = config.getValues(r);
    // Temperature is the one metric where zero and below are real readings.
    return metric === 'temperature'
      ? values.some((v) => v !== null && isFinite(v))
      : values.some((v) => v !== null && v > 0);
  });

  const chartData = useMemo(() => {
    if (routesWithData.length === 0) return [];

    let maxDistance = 0;
    const routeDistMetric: { distances: number[]; values: (number | null)[] }[] = [];

    for (const route of routesWithData) {
      const distances = buildCumulativeDistances(route.coordinates);
      const totalDist = distances[distances.length - 1];
      if (totalDist > maxDistance) maxDistance = totalDist;
      routeDistMetric.push({ distances, values: config.getValues(route) });
    }

    // Sample — use rolling average to smooth noisy data
    const sampleCount = Math.min(300, Math.max(80, Math.round(maxDistance * 30)));
    const interval = maxDistance / sampleCount;
    const data: ChartDataPoint[] = [];
    const windowRadius = Math.max(1, Math.round(5 / (interval * 1000)));

    for (let d = 0; d <= maxDistance; d += interval) {
      const point: ChartDataPoint = { distance: Math.round(d * 1000) / 1000 };

      for (let i = 0; i < routesWithData.length; i++) {
        const { distances, values } = routeDistMetric[i];
        const route = routesWithData[i];

        if (d > distances[distances.length - 1]) {
          point[route.id] = null;
          continue;
        }

        // Find index
        let low = 0;
        let high = distances.length - 1;
        while (low < high - 1) {
          const mid = Math.floor((low + high) / 2);
          if (distances[mid] <= d) low = mid;
          else high = mid;
        }

        // Smoothed average around this point
        const start = Math.max(0, low - windowRadius);
        const end = Math.min(values.length - 1, low + windowRadius);
        let sum = 0;
        let count = 0;
        for (let j = start; j <= end; j++) {
          const v = values[j];
          // Below-zero readings are real for temperature; for every other
          // metric a zero means "no reading" and must not drag the mean down.
          const usable = v !== null && isFinite(v) && (allowsNonPositive || v > 0);
          if (usable) {
            sum += v;
            count++;
          }
        }

        point[route.id] = count > 0 ? Math.round((sum / count) * 100) / 100 : null;
      }

      data.push(point);
    }

    return data;
  }, [routesWithData, config, allowsNonPositive]);

  if (routesWithData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">No {config.label.toLowerCase()} data available</p>
      </div>
    );
  }

  // Round the axis out to whole numbers rather than letting Recharts pick
  // bounds off the data — a 103-178bpm trace otherwise labels 103, 118, 133...
  const plotted = chartData.flatMap((row) =>
    selectedRouteIds
      .map((id) => row[id])
      .filter((v): v is number => typeof v === 'number' && isFinite(v))
  );
  const axis = plotted.length
    ? niceAxisBounds(Math.min(...plotted), Math.max(...plotted), axisOptionsFor(metric))
    : null;

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
          reversed={config.reversed}
          tickFormatter={(v) => config.formatValue(v)}
          label={{ value: `${config.label} (${config.unit})`, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#a1a1aa' }}
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
                  const route = routesWithData.find((r) => r.id === entry.dataKey);
                  if (!route || entry.value === null || entry.value === undefined) return null;
                  return (
                    <p key={entry.dataKey} className="text-xs font-medium" style={{ color: entry.color }}>
                      {route.displayName}: {config.formatValue(entry.value as number)} {config.unit}
                    </p>
                  );
                })}
              </div>
            );
          }}
        />
        {routesWithData.length > 1 && (
          <Legend
            formatter={(value) => {
              const route = routesWithData.find((r) => r.id === value);
              return <span className="text-xs">{route?.displayName || value}</span>;
            }}
          />
        )}
        {routesWithData.map((route) => (
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
