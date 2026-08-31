'use client';

import { useMemo } from 'react';
import { RouteData, BestEffort, SteepSection } from '@/lib/route-comparison/types';
import {
  calculateBestEfforts,
  calculateEffortScore,
  calculateZones,
  detectSteepSections,
  calculateSplits,
} from '@/lib/route-comparison/analysis';
import {
  formatDuration,
  formatPace,
  formatDistance,
  formatElevation,
  formatHeartRate,
} from '@/lib/route-comparison/formatting';
import { Zap, Award, Mountain, BarChart3, TrendingUp } from 'lucide-react';

interface InsightsPanelProps {
  route: RouteData;
}

export default function InsightsPanel({ route }: InsightsPanelProps) {
  const effortScore = useMemo(() => calculateEffortScore(route), [route]);
  const bestEfforts = useMemo(() => calculateBestEfforts(route), [route]);
  const steepSections = useMemo(() => detectSteepSections(route), [route]);
  const hrZones = useMemo(() => {
    if (!route.heartRates.some((hr) => hr !== null)) return null;
    return calculateZones(route.heartRates, route.timestamps, 'heartRate', route.hrZoneBoundaries);
  }, [route]);
  const splits = useMemo(() => calculateSplits(route), [route]);

  // Pace consistency
  const paceConsistency = useMemo(() => {
    const validPaces = splits
      .filter((s) => !s.isPartial && s.pace !== null && s.pace > 0 && s.pace < 20)
      .map((s) => s.pace as number);

    if (validPaces.length < 3) return null;

    const avg = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;
    const variance = validPaces.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / validPaces.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avg) * 100;

    let rating: string;
    let color: string;
    if (cv < 3) { rating = 'Metronome'; color = '#34A853'; }
    else if (cv < 5) { rating = 'Very Even'; color = '#4285F4'; }
    else if (cv < 8) { rating = 'Steady'; color = '#FBBC04'; }
    else if (cv < 12) { rating = 'Variable'; color = '#FF9800'; }
    else { rating = 'Erratic'; color = '#EA4335'; }

    return { cv, rating, color, avgPace: avg, stdDev, splitCount: validPaces.length };
  }, [splits]);

  return (
    <div className="space-y-4">
      {/* Effort Score */}
      <div className="bg-white dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-orange-500" />
          <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Effort Score</h4>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#27272a"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={effortScore.color}
                strokeWidth="3"
                strokeDasharray={`${effortScore.score}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color: effortScore.color }}>
                {effortScore.score}
              </span>
            </div>
          </div>
          <div>
            <p className="text-lg font-display font-bold" style={{ color: effortScore.color }}>
              {effortScore.category}
            </p>
            <p className="text-xs text-zinc-500">
              Based on {effortScore.factorsUsed} factor{effortScore.factorsUsed !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Best Efforts */}
      {bestEfforts.length > 0 && (
        <div className="bg-white dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Best Efforts</h4>
          </div>
          <div className="space-y-2">
            {bestEfforts.map((effort) => (
              <div key={effort.distanceLabel} className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                  {effort.distanceLabel}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-900 dark:text-white font-mono">
                    {formatDuration(effort.duration)}
                  </span>
                  <span className="text-zinc-500 font-mono">
                    {formatPace(effort.pace)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HR Zones */}
      {hrZones && (
        <div className="bg-white dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Heart Rate Zones</h4>
          </div>
          <div className="space-y-1.5">
            {hrZones.zones.map((zone) => (
              <div key={zone.zone} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-zinc-500 truncate">Z{zone.zone} {zone.name}</span>
                <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${zone.percent}%`,
                      backgroundColor: zone.color,
                      minWidth: zone.percent > 0 ? '2px' : 0,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-zinc-600 dark:text-zinc-400 font-mono">
                  {zone.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pace Consistency */}
      {paceConsistency && (
        <div className="bg-white dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Pace Consistency</h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-display font-bold" style={{ color: paceConsistency.color }}>
              {paceConsistency.rating}
            </span>
            <span className="text-xs text-zinc-500">
              CV: {paceConsistency.cv.toFixed(1)}% across {paceConsistency.splitCount} splits
            </span>
          </div>
        </div>
      )}

      {/* Steep Sections */}
      {(steepSections.climbs.length > 0 || steepSections.descents.length > 0) && (
        <div className="bg-white dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mountain className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Steep Sections</h4>
          </div>
          {steepSections.climbs.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-zinc-500 mb-1 font-medium">Climbs ({steepSections.climbs.length})</p>
              {steepSections.climbs.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatDistance(s.startKm)}–{formatDistance(s.endKm)}
                  </span>
                  <span className="text-red-500 font-mono">
                    +{formatElevation(s.elevChange)} ({s.avgGrade.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
          {steepSections.descents.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1 font-medium">Descents ({steepSections.descents.length})</p>
              {steepSections.descents.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatDistance(s.startKm)}–{formatDistance(s.endKm)}
                  </span>
                  <span className="text-blue-500 font-mono">
                    -{formatElevation(s.elevChange)} ({s.avgGrade.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
