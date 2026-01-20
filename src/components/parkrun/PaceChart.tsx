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
} from 'recharts';
import { formatTime } from '@/lib/parkrun-types';
import type { ParkrunResult } from '@/lib/parkrun-types';

interface PaceChartProps {
  parkruns: ParkrunResult[];
  personalBest: number;
}

export function PaceChart({ parkruns, personalBest }: PaceChartProps) {
  // Process data for chart - reverse to show oldest first
  const chartData = useMemo(() => {
    const sorted = [...parkruns].reverse();

    // Calculate rolling average (10 runs)
    return sorted.map((run, index) => {
      const windowStart = Math.max(0, index - 9);
      const window = sorted.slice(windowStart, index + 1);
      const rollingAvg = Math.round(
        window.reduce((sum, r) => sum + r.time_seconds, 0) / window.length
      );

      return {
        date: run.date,
        time: run.time_seconds,
        rollingAvg,
        venue: run.event,
        pb: run.pb,
      };
    });
  }, [parkruns]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof chartData[0] }>;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const date = new Date(data.date);

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-zinc-500 mb-1">
          {date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
        <p className="text-white font-medium">{data.venue}</p>
        <div className="mt-2 space-y-1">
          <p className="text-sm">
            <span className="text-zinc-400">Time: </span>
            <span className={`font-mono ${data.pb ? 'text-green-400' : 'text-white'}`}>
              {formatTime(data.time)}
              {data.pb && ' 🏆'}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-zinc-400">Avg: </span>
            <span className="text-blue-400 font-mono">{formatTime(data.rollingAvg)}</span>
          </p>
        </div>
      </div>
    );
  };

  // Format Y-axis (time in seconds to MM:SS)
  const formatYAxis = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}:00`;
  };

  // Calculate Y-axis domain
  const times = parkruns.map(r => r.time_seconds);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const padding = (maxTime - minTime) * 0.1;

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
        >
          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              const d = new Date(date);
              return d.getFullYear().toString();
            }}
            stroke="#52525b"
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minTime - padding, maxTime + padding]}
            tickFormatter={formatYAxis}
            stroke="#52525b"
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={false}
            reversed
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* PB Reference Line */}
          <ReferenceLine
            y={personalBest}
            stroke="#22c55e"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `PB: ${formatTime(personalBest)}`,
              fill: '#22c55e',
              fontSize: 12,
              position: 'right',
            }}
          />

          {/* Rolling average line */}
          <Line
            type="monotone"
            dataKey="rollingAvg"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="10-run average"
          />

          {/* Individual run dots */}
          <Line
            type="monotone"
            dataKey="time"
            stroke="#22c55e"
            strokeWidth={1}
            strokeOpacity={0.3}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.pb) {
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="#22c55e"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill="#22c55e"
                  fillOpacity={0.5}
                />
              );
            }}
            activeDot={{
              r: 6,
              fill: '#22c55e',
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-zinc-400">Individual runs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500" />
          <span className="text-sm text-zinc-400">10-run average</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-green-500 border-dashed border-t-2 border-green-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-sm text-zinc-400">Personal best</span>
        </div>
      </div>
    </div>
  );
}
