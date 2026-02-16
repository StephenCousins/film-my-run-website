'use client';

import { useState, useMemo } from 'react';
import { RouteData, SegmentMetrics } from '@/lib/route-comparison/types';
import { buildCumulativeDistances, findIndexAtDistance } from '@/lib/route-comparison/gps';
import {
  calculateSplitPace,
  calculateSplitElevGain,
  calculateSplitElevLoss,
  calculateSplitAvg,
} from '@/lib/route-comparison/analysis';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatElevation,
  formatHeartRate,
  formatCadence,
} from '@/lib/route-comparison/formatting';

interface SegmentAnalysisProps {
  routes: RouteData[];
  selectedRouteIds: string[];
}

function calculateSegment(route: RouteData, startKm: number, endKm: number): SegmentMetrics | null {
  if (!route.coordinates || route.coordinates.length < 2) return null;

  const distances = buildCumulativeDistances(route.coordinates);
  const totalDist = distances[distances.length - 1];

  if (startKm >= totalDist) return null;
  const clampedEnd = Math.min(endKm, totalDist);

  const startIdx = findIndexAtDistance(distances, startKm);
  const endIdx = findIndexAtDistance(distances, clampedEnd);

  if (startIdx >= endIdx) return null;

  let duration: number | null = null;
  if (route.timestamps && route.timestamps[startIdx] && route.timestamps[endIdx]) {
    duration = (route.timestamps[endIdx]!.getTime() - route.timestamps[startIdx]!.getTime()) / 1000;
  }

  return {
    startKm,
    endKm: clampedEnd,
    actualDistance: clampedEnd - startKm,
    duration,
    pace: calculateSplitPace(route, startIdx, endIdx),
    elevGain: calculateSplitElevGain(route.elevations, startIdx, endIdx),
    elevLoss: calculateSplitElevLoss(route.elevations, startIdx, endIdx),
    avgHR: calculateSplitAvg(route.heartRates, startIdx, endIdx),
    avgCadence: calculateSplitAvg(route.cadences, startIdx, endIdx),
    avgPower: calculateSplitAvg(route.powers, startIdx, endIdx),
  };
}

export default function SegmentAnalysis({ routes, selectedRouteIds }: SegmentAnalysisProps) {
  const visibleRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));
  const maxDistance = Math.max(...visibleRoutes.map((r) => r.stats.distance), 0);

  const [startKm, setStartKm] = useState(0);
  const [endKm, setEndKm] = useState(Math.min(5, maxDistance));

  const segments = useMemo(() => {
    const map = new Map<string, SegmentMetrics | null>();
    for (const route of visibleRoutes) {
      map.set(route.id, calculateSegment(route, startKm, endKm));
    }
    return map;
  }, [visibleRoutes, startKm, endKm]);

  if (visibleRoutes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-zinc-500 text-sm">Select routes to analyze segments</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">From</label>
          <input
            type="number"
            min={0}
            max={endKm - 0.1}
            step={0.5}
            value={startKm}
            onChange={(e) => setStartKm(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-20 px-2 py-1 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded text-zinc-900 dark:text-white"
          />
          <span className="text-xs text-zinc-500">km</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">To</label>
          <input
            type="number"
            min={startKm + 0.1}
            max={maxDistance}
            step={0.5}
            value={endKm}
            onChange={(e) => setEndKm(Math.min(maxDistance, parseFloat(e.target.value) || 0))}
            className="w-20 px-2 py-1 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded text-zinc-900 dark:text-white"
          />
          <span className="text-xs text-zinc-500">km</span>
        </div>
        {/* Quick presets */}
        <div className="flex gap-1">
          {[1, 5, 10].filter((d) => d <= maxDistance).map((d) => (
            <button
              key={d}
              onClick={() => { setStartKm(0); setEndKm(d); }}
              className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              First {d}km
            </button>
          ))}
          <button
            onClick={() => { setStartKm(0); setEndKm(maxDistance); }}
            className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Full
          </button>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase">Route</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Distance</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Duration</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Pace</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Elev +</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Elev -</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 uppercase">Avg HR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {visibleRoutes.map((route) => {
              const seg = segments.get(route.id);
              if (!seg) {
                return (
                  <tr key={route.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: route.color }} />
                        <span className="text-sm text-zinc-900 dark:text-white">{route.displayName}</span>
                      </div>
                    </td>
                    <td colSpan={6} className="px-3 py-2 text-right text-xs text-zinc-400">
                      Segment not covered
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={route.id}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: route.color }} />
                      <span className="text-sm text-zinc-900 dark:text-white">{route.displayName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    {formatDistance(seg.actualDistance)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    {formatDuration(seg.duration)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    {formatPace(seg.pace)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-green-600 dark:text-green-400 font-mono">
                    +{formatElevation(seg.elevGain)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-red-500 font-mono">
                    -{formatElevation(seg.elevLoss)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    {formatHeartRate(seg.avgHR)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
