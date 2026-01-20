'use client';

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Sun, Snowflake, Leaf, Cloud, MapPin, Timer } from 'lucide-react';
import { formatTime } from '@/lib/parkrun-types';

interface InsightsSectionProps {
  monthlyStats: { month: string; runs: number; average_time: number }[];
  seasonalAverages: {
    winter: number;
    spring: number;
    summer: number;
    autumn: number;
  };
  bestSeason: 'winter' | 'spring' | 'summer' | 'autumn';
  fastestVenues: {
    event: string;
    visit_count: number;
    best_time_seconds: number;
    best_time_formatted: string;
  }[];
  totalImprovement: number;
  rollingAverage: number;
}

export function InsightsSection({
  monthlyStats,
  seasonalAverages,
  bestSeason,
  fastestVenues,
  totalImprovement,
  rollingAverage,
}: InsightsSectionProps) {
  // Calculate 12-month rolling average data
  const rollingAverageData = monthlyStats.slice(-24).map((stat, index, arr) => {
    // Calculate rolling average for last 12 months at each point
    const start = Math.max(0, index - 11);
    const window = arr.slice(start, index + 1);
    const avg = Math.round(
      window.reduce((sum, s) => sum + s.average_time, 0) / window.length
    );

    return {
      month: stat.month,
      average: stat.average_time,
      rolling: avg,
    };
  });

  const seasonIcons = {
    winter: <Snowflake className="w-5 h-5" />,
    spring: <Leaf className="w-5 h-5" />,
    summer: <Sun className="w-5 h-5" />,
    autumn: <Cloud className="w-5 h-5" />,
  };

  const seasonLabels = {
    winter: 'Winter',
    spring: 'Spring',
    summer: 'Summer',
    autumn: 'Autumn',
  };

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof rollingAverageData[0] }>;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const date = new Date(data.month + '-01');

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-zinc-500 mb-2">
          {date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-zinc-400">Monthly avg: </span>
            <span className="text-white font-mono">{formatTime(data.average)}</span>
          </p>
          <p className="text-sm">
            <span className="text-zinc-400">Rolling avg: </span>
            <span className="text-blue-400 font-mono">{formatTime(data.rolling)}</span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Rolling average */}
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Timer className="w-4 h-4" />
            <span className="text-sm">12-Month Average</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {formatTime(rollingAverage)}
          </p>
        </div>

        {/* Total improvement */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/5 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Improvement</span>
          </div>
          <p className="text-2xl font-bold text-green-400 font-mono">
            {Math.floor(totalImprovement / 60)}:{(totalImprovement % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-xs text-green-500/70 mt-1">from first run to PB</p>
        </div>

        {/* Best season */}
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            {seasonIcons[bestSeason]}
            <span className="text-sm">Best Season</span>
          </div>
          <p className="text-2xl font-bold text-white">{seasonLabels[bestSeason]}</p>
          <p className="text-xs text-zinc-500 mt-1">
            avg {formatTime(seasonalAverages[bestSeason])}
          </p>
        </div>
      </div>

      {/* Rolling average chart */}
      <div>
        <h4 className="text-sm text-zinc-400 mb-4">Performance Trend (Last 2 Years)</h4>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rollingAverageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tickFormatter={(month) => {
                  const date = new Date(month + '-01');
                  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
                }}
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['dataMin - 60', 'dataMax + 60']}
                tickFormatter={(seconds) => `${Math.floor(seconds / 60)}:00`}
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={false}
                reversed
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#22c55e"
                strokeWidth={1}
                strokeOpacity={0.3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="rolling"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seasonal comparison */}
      <div>
        <h4 className="text-sm text-zinc-400 mb-4">Seasonal Performance</h4>
        <div className="grid grid-cols-4 gap-3">
          {(['winter', 'spring', 'summer', 'autumn'] as const).map((season) => {
            const isBest = season === bestSeason;
            return (
              <motion.div
                key={season}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                  p-3 rounded-lg text-center
                  ${isBest
                    ? 'bg-gradient-to-b from-green-500/20 to-transparent border border-green-500/30'
                    : 'bg-zinc-800/50'
                  }
                `}
              >
                <div className={`${isBest ? 'text-green-400' : 'text-zinc-400'}`}>
                  {seasonIcons[season]}
                </div>
                <p className="text-xs text-zinc-500 mt-1 capitalize">{season}</p>
                <p className={`text-sm font-mono mt-1 ${isBest ? 'text-green-400' : 'text-white'}`}>
                  {seasonalAverages[season] > 0 ? formatTime(seasonalAverages[season]) : '-'}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Top 5 fastest venues */}
      <div>
        <h4 className="text-sm text-zinc-400 mb-4">Fastest Venues (min. 3 visits)</h4>
        <div className="space-y-2">
          {fastestVenues.map((venue, index) => (
            <motion.div
              key={venue.event}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
            >
              <span className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${index === 0 ? 'bg-amber-500 text-black' :
                  index === 1 ? 'bg-zinc-400 text-black' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-zinc-700 text-zinc-300'}
              `}>
                {index + 1}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-white">{venue.event}</span>
                <span className="text-xs text-zinc-500">({venue.visit_count} visits)</span>
              </div>
              <span className="font-mono text-green-400">{venue.best_time_formatted}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
