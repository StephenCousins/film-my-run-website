'use client';

import { motion } from 'framer-motion';
import { MapPin, Hash, Trophy, Calendar } from 'lucide-react';
import type { VenueStats } from '@/lib/parkrun-types';

interface VenueCardProps {
  venue: VenueStats;
  index: number;
  isHome?: boolean;
}

export function VenueCard({ venue, index, isHome = false }: VenueCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`
        relative rounded-xl border p-4 transition-all hover:scale-[1.02]
        ${isHome
          ? 'bg-gradient-to-br from-green-500/20 to-green-600/5 border-green-500/30'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        }
      `}
    >
      {/* Home badge */}
      {isHome && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
          HOME
        </div>
      )}

      {/* Venue name */}
      <div className="flex items-start gap-2 mb-3">
        <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHome ? 'text-green-400' : 'text-green-500'}`} />
        <h3 className="text-white font-medium leading-tight">{venue.event}</h3>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Visit count */}
        <div className="flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-sm text-zinc-400">
            {venue.visit_count} visit{venue.visit_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Best time */}
        <div className="flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-sm font-mono text-green-400">{venue.best_time_formatted}</span>
        </div>
      </div>

      {/* Date range for multiple visits */}
      {venue.visit_count > 1 && (
        <div className="mt-2 pt-2 border-t border-zinc-800/50">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date(venue.first_visit).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
              {' → '}
              {new Date(venue.last_visit).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
