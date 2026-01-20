'use client';

import { motion } from 'framer-motion';
import { MapPin, Hash, Trophy } from 'lucide-react';
import type { VenueStats } from '@/lib/parkrun-types';

interface VenueCardCompactProps {
  venue: VenueStats;
  index: number;
  isHome?: boolean;
}

export function VenueCardCompact({ venue, index, isHome = false }: VenueCardCompactProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`
        flex-shrink-0 w-48 rounded-xl border p-3 transition-all hover:scale-[1.02]
        ${isHome
          ? 'bg-gradient-to-br from-green-500/20 to-green-600/5 border-green-500/30'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        }
      `}
    >
      {/* Venue name */}
      <div className="flex items-start gap-2 mb-2">
        <MapPin className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isHome ? 'text-green-400' : 'text-green-500'}`} />
        <h3 className="text-sm text-white font-medium leading-tight line-clamp-2">{venue.event}</h3>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-zinc-400">
          <Hash className="w-3 h-3" />
          <span>{venue.visit_count}</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-500" />
          <span className="font-mono text-green-400">{venue.best_time_formatted}</span>
        </div>
      </div>

      {/* Home badge */}
      {isHome && (
        <div className="mt-2 text-center">
          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
            HOME
          </span>
        </div>
      )}
    </motion.div>
  );
}
