'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Check, X, MapPin, Trophy } from 'lucide-react';
import { formatTime } from '@/lib/parkrun-types';
import type { UKRanking } from '@/lib/parkrun-types';

interface RankingsSearchProps {
  initialRankings?: UKRanking[];
  userCompletion?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export function RankingsSearch({ initialRankings, userCompletion }: RankingsSearchProps) {
  const [rankings, setRankings] = useState<UKRanking[]>(initialRankings || []);
  const [completion, setCompletion] = useState(userCompletion);
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialRankings);
  const [displayCount, setDisplayCount] = useState(20);

  // Fetch rankings if not provided
  const fetchRankings = useCallback(async (searchTerm?: string) => {
    setIsLoading(true);
    try {
      const url = searchTerm
        ? `/api/parkrun/rankings?search=${encodeURIComponent(searchTerm)}`
        : '/api/parkrun/rankings';

      const res = await fetch(url);
      const data = await res.json();

      if (data.ok) {
        setRankings(data.rankings);
        setCompletion(data.userCompletion);
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialRankings) {
      fetchRankings();
    }
  }, [initialRankings, fetchRankings]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        fetchRankings(search);
      } else if (!initialRankings) {
        fetchRankings();
      } else {
        setRankings(initialRankings);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, initialRankings, fetchRankings]);

  // Difficulty color
  const getDifficultyColor = (rating: number) => {
    if (rating >= 8) return 'text-red-400 bg-red-500/20';
    if (rating >= 6) return 'text-orange-400 bg-orange-500/20';
    if (rating >= 4) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-green-400 bg-green-500/20';
  };

  const displayedRankings = rankings.slice(0, isExpanded ? displayCount : 10);
  const hasMore = rankings.length > displayCount;

  return (
    <div className="space-y-4">
      {/* Completion progress */}
      {completion && (
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">UK Parkruns Completed</span>
            <span className="text-lg font-bold text-white">
              {completion.completed} / {completion.total}
            </span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completion.percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {completion.percentage}% complete - {completion.total - completion.completed} remaining
          </p>
        </div>
      )}

      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venues..."
          className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Rankings list */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 p-3 bg-zinc-800/50 text-xs text-zinc-500 font-medium">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Venue</div>
          <div className="col-span-2 text-center">Difficulty</div>
          <div className="col-span-2 text-center">Your Best</div>
          <div className="col-span-2 text-center">Visits</div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-8 text-center text-zinc-500">
            Loading rankings...
          </div>
        )}

        {/* Rankings rows */}
        {!isLoading && (
          <AnimatePresence>
            {displayedRankings.map((ranking, index) => (
              <motion.div
                key={ranking.venue}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`
                  grid grid-cols-12 gap-2 p-3 items-center border-t border-zinc-800/50
                  ${ranking.user_visited ? 'bg-green-500/5' : ''}
                  hover:bg-zinc-800/30 transition-colors
                `}
              >
                {/* Rank */}
                <div className="col-span-1 text-zinc-500 text-sm">
                  {ranking.rank}
                </div>

                {/* Venue */}
                <div className="col-span-5 flex items-center gap-2">
                  {ranking.user_visited ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  )}
                  <span className={`text-sm truncate ${ranking.user_visited ? 'text-white' : 'text-zinc-400'}`}>
                    {ranking.venue}
                  </span>
                </div>

                {/* Difficulty */}
                <div className="col-span-2 flex justify-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(ranking.difficulty_rating)}`}>
                    {ranking.difficulty_rating.toFixed(1)}
                  </span>
                </div>

                {/* Your best time */}
                <div className="col-span-2 text-center">
                  {ranking.user_best_time ? (
                    <span className="text-green-400 font-mono text-sm">
                      {formatTime(ranking.user_best_time)}
                    </span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </div>

                {/* Visit count */}
                <div className="col-span-2 text-center">
                  {ranking.user_visits > 0 ? (
                    <span className="text-zinc-300 text-sm">{ranking.user_visits}</span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Show more/less */}
        {!isLoading && rankings.length > 10 && (
          <div className="p-3 border-t border-zinc-800">
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show more ({rankings.length - 10} more)
                  </>
                )}
              </button>

              {isExpanded && hasMore && (
                <button
                  onClick={() => setDisplayCount(prev => prev + 50)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-sm text-green-400 transition-colors"
                >
                  Load 50 more
                </button>
              )}
            </div>
          </div>
        )}

        {/* No results */}
        {!isLoading && rankings.length === 0 && search && (
          <div className="p-8 text-center text-zinc-500">
            No venues found matching &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
