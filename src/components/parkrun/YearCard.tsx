'use client';

import { motion } from 'framer-motion';
import { Calendar, Trophy, TrendingUp, Medal } from 'lucide-react';
import type { YearlyStats } from '@/lib/parkrun-types';

interface YearCardProps {
  stats: YearlyStats;
  index: number;
  cumulativeTotal: number;
}

export function YearCard({ stats, index, cumulativeTotal }: YearCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex-shrink-0 w-72 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/20 to-transparent p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.year}</span>
          </div>
          <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
            #{cumulativeTotal} total
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-4">
        {/* Runs count with mini bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Runs</span>
            <span className="text-xl font-bold text-zinc-900 dark:text-white font-mono">{stats.runs}</span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (stats.runs / 52) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-1">{Math.round((stats.runs / 52) * 100)}% of Saturdays</p>
        </div>

        {/* Best time */}
        <div className="flex items-center justify-between py-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Best Time</span>
          </div>
          <span className="font-mono font-medium text-green-500 dark:text-green-400">{stats.best_time_formatted}</span>
        </div>

        {/* Best position */}
        <div className="flex items-center justify-between py-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Best Position</span>
          </div>
          <span className="font-mono font-medium text-zinc-900 dark:text-white">{stats.best_position}</span>
        </div>

        {/* Average time */}
        <div className="flex items-center justify-between py-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Average</span>
          </div>
          <span className="font-mono text-zinc-600 dark:text-zinc-300">
            {Math.floor(stats.average_time_seconds / 60)}:{(stats.average_time_seconds % 60).toString().padStart(2, '0')}
          </span>
        </div>

        {/* PB count if any */}
        {stats.pb_count > 0 && (
          <div className="bg-green-500/10 rounded-lg p-2 text-center">
            <span className="text-green-400 text-sm font-medium">
              {stats.pb_count} PB{stats.pb_count > 1 ? 's' : ''} set this year
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Bar chart showing runs per year - all bars aligned at bottom
interface YearBarChartProps {
  yearlyStats: YearlyStats[];
}

export function YearBarChart({ yearlyStats }: YearBarChartProps) {
  const maxRuns = Math.max(...yearlyStats.map(y => y.runs));
  const chartHeight = 120; // Fixed height in pixels

  return (
    <div className="flex items-end gap-2 justify-center" style={{ height: `${chartHeight + 24}px` }}>
      {yearlyStats.slice().reverse().map((year, index) => {
        const barHeight = Math.max(4, (year.runs / maxRuns) * chartHeight);

        return (
          <div
            key={year.year}
            className="flex flex-col items-center justify-end"
            style={{ height: `${chartHeight + 24}px` }}
          >
            {/* Bar container - fixed height with bar at bottom */}
            <div className="relative" style={{ height: `${chartHeight}px`, width: '32px' }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 to-green-400 rounded-t hover:from-green-500 hover:to-green-300 transition-colors cursor-pointer group"
              >
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-700 dark:bg-zinc-800 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  {year.runs} runs
                </div>
              </motion.div>
            </div>
            {/* Year label */}
            <span className="text-xs text-zinc-500 mt-2">{year.year.toString().slice(-2)}</span>
          </div>
        );
      })}
    </div>
  );
}
