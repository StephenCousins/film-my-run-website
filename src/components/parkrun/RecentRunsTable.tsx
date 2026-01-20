'use client';

import { motion } from 'framer-motion';
import { ExternalLink, MapPin, Clock, Medal } from 'lucide-react';
import type { ParkrunResult } from '@/lib/parkrun-types';

interface RecentRunsTableProps {
  runs: ParkrunResult[];
}

export function RecentRunsTable({ runs }: RecentRunsTableProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Date</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Venue</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400">Time</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400">Position</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400">PB</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run, index) => (
            <motion.tr
              key={run.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-4 px-4">
                <span className="text-sm text-zinc-300">{formatDate(run.date)}</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span className="text-white font-medium">{run.event}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span className={`font-mono font-medium ${run.pb ? 'text-green-400' : 'text-white'}`}>
                    {run.time_formatted}
                  </span>
                </div>
              </td>
              <td className="py-4 px-4 text-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-sm font-medium text-zinc-300">
                  {run.position}
                </span>
              </td>
              <td className="py-4 px-4 text-center">
                {run.pb && (
                  <Medal className="w-5 h-5 text-amber-400 mx-auto" />
                )}
              </td>
              <td className="py-4 px-4 text-right">
                <a
                  href={`https://www.parkrun.org.uk/${run.event.toLowerCase().replace(/\s+/g, '')}/results/weeklyresults/?runSeqNumber=${run.run_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-green-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
