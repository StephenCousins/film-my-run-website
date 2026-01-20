'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { AgeCategoryStats } from '@/lib/parkrun-types';

interface AgeCategoryChartProps {
  stats: AgeCategoryStats[];
}

export function AgeCategoryChart({ stats }: AgeCategoryChartProps) {
  // Prepare data - only show positions 1-10 and aggregate rest
  const chartData: { position: string; count: number }[] = [];
  const maxPosition = 10;

  for (let i = 1; i <= maxPosition; i++) {
    const found = stats.find(s => s.position === i);
    chartData.push({
      position: i.toString(),
      count: found?.count || 0,
    });
  }

  // Aggregate positions > 10
  const restCount = stats
    .filter(s => s.position > maxPosition)
    .reduce((sum, s) => sum + s.count, 0);

  if (restCount > 0) {
    chartData.push({
      position: '11+',
      count: restCount,
    });
  }

  const maxCount = Math.max(...chartData.map(d => d.count));

  // Color gradient - gold for top positions, fading to gray
  const getBarColor = (position: string) => {
    const pos = parseInt(position) || 11;
    if (pos === 1) return '#fbbf24'; // Gold
    if (pos === 2) return '#9ca3af'; // Silver
    if (pos === 3) return '#cd7f32'; // Bronze
    if (pos <= 5) return '#22c55e';  // Green
    return '#3f3f46';                // Zinc
  };

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof chartData[0] }>;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl">
        <p className="text-white font-medium">
          Position {data.position}
        </p>
        <p className="text-zinc-400 text-sm">
          {data.count} time{data.count !== 1 ? 's' : ''}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="position"
              stroke="#52525b"
              tick={{ fill: '#71717a', fontSize: 12 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis
              stroke="#52525b"
              tick={{ fill: '#71717a', fontSize: 12 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.position}
                  fill={getBarColor(entry.position)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Position badges grid */}
      <div className="grid grid-cols-5 gap-2">
        {stats.slice(0, 10).map((stat, index) => (
          <motion.div
            key={stat.position}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`
              text-center p-2 rounded-lg
              ${stat.position === 1 ? 'bg-amber-500/20 border border-amber-500/30' :
                stat.position === 2 ? 'bg-zinc-400/20 border border-zinc-400/30' :
                stat.position === 3 ? 'bg-orange-700/20 border border-orange-700/30' :
                'bg-zinc-800/50 border border-zinc-700/50'}
            `}
          >
            <div className={`
              text-lg font-bold
              ${stat.position === 1 ? 'text-amber-400' :
                stat.position === 2 ? 'text-zinc-300' :
                stat.position === 3 ? 'text-orange-400' :
                'text-zinc-400'}
            `}>
              {stat.position === 1 ? '🥇' : stat.position === 2 ? '🥈' : stat.position === 3 ? '🥉' : stat.position}
            </div>
            <div className="text-xs text-zinc-500">{stat.count}×</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
