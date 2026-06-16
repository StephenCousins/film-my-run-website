'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, Footprints } from 'lucide-react';
import type { Shoe } from './ShoeFinderClient';

const CATEGORY_LABELS: Record<string, string> = {
  daily_trainer: 'Daily Trainer',
  race: 'Race',
  long_run: 'Long Run',
  speed: 'Speed',
  ultra: 'Ultra',
  stability: 'Stability',
  max_cushion: 'Max Cushion',
  minimal: 'Minimal',
};

const SOURCE_LABELS: Record<string, string> = {
  runrepeat: 'RunRepeat',
  runners_world: "Runner's World",
  irunfar: 'iRunFar',
  believe_in_run: 'Believe in the Run',
  the_run_testers: 'The Run Testers',
  other: 'Other',
};

const TERRAIN_STYLES: Record<string, string> = {
  road: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  trail: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  both: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
};

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 9 ? '#22c55e' : score >= 8 ? '#f88c00' : score >= 7 ? '#eab308' : '#ef4444';
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-14 h-14 flex-none">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={r} stroke="#27272a" strokeWidth="3" fill="none" />
        <circle
          cx="28" cy="28" r={r}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-sm font-bold font-mono text-[#fafafa] leading-none">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default function ShoeCard({ shoe, rank }: { shoe: Shoe; rank: number | null }) {
  const [expanded, setExpanded] = useState(false);
  const hasReviews = shoe.reviews.length > 0;

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300 flex flex-col">

      {/* Image */}
      <div className="relative bg-[#111113] h-48 flex items-center justify-center overflow-hidden">
        {shoe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shoe.imageUrl}
            alt={`${shoe.brand} ${shoe.model}`}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <Footprints className="w-14 h-14 text-[#3f3f46]" strokeWidth={1} />
        )}

        {/* Rank badge */}
        {rank !== null && shoe.avgScore !== null && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-md shadow-orange-500/30">
            #{rank}
          </div>
        )}

        {/* Terrain badge */}
        <span className={`absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full capitalize backdrop-blur-sm ${TERRAIN_STYLES[shoe.terrain] ?? ''}`}>
          {shoe.terrain}
        </span>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[#18181b] to-transparent" />
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Brand + model + score */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-0.5">
              {shoe.brand}
            </p>
            <h3 className="font-semibold text-[#fafafa] text-base leading-tight">
              {shoe.model}
            </h3>
            {shoe.releaseYear && (
              <p className="text-xs text-zinc-600 mt-0.5">{shoe.releaseYear}</p>
            )}
          </div>

          {shoe.avgScore !== null ? (
            <ScoreRing score={shoe.avgScore} />
          ) : (
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#27272a] flex items-center justify-center flex-none">
              <span className="text-xs text-zinc-600">—</span>
            </div>
          )}
        </div>

        {/* Category + specs pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-xs bg-[#27272a] text-zinc-400 px-2.5 py-0.5 rounded-md">
            {CATEGORY_LABELS[shoe.category] ?? shoe.category}
          </span>
          {shoe.dropMm !== null && (
            <span className="text-xs bg-[#27272a] text-zinc-400 px-2.5 py-0.5 rounded-md">
              {shoe.dropMm}mm drop
            </span>
          )}
          {shoe.weightG !== null && (
            <span className="text-xs bg-[#27272a] text-zinc-400 px-2.5 py-0.5 rounded-md">
              {shoe.weightG}g
            </span>
          )}
          {shoe.stackHeightMm !== null && (
            <span className="text-xs bg-[#27272a] text-zinc-400 px-2.5 py-0.5 rounded-md">
              {shoe.stackHeightMm}mm stack
            </span>
          )}
        </div>

        {/* Description */}
        {shoe.description && (
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-3">
            {shoe.description}
          </p>
        )}

        {/* Review count */}
        {shoe.reviewCount > 0 && (
          <p className="text-xs text-zinc-600 mb-2">
            Avg of {shoe.reviewCount} expert source{shoe.reviewCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Expand reviews */}
        {hasReviews && (
          <>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 transition-colors font-medium mb-1"
            >
              Review breakdown
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 space-y-3 border-t border-[#27272a] mt-1">
                    {shoe.reviews.map(r => (
                      <div key={r.source}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-zinc-400">
                            {SOURCE_LABELS[r.source] ?? r.source}
                          </span>
                          <div className="flex items-center gap-2">
                            {r.expertScore !== null && (
                              <span className="text-xs font-bold text-[#fafafa]">
                                {r.expertScore.toFixed(1)}<span className="text-zinc-600 font-normal">/10</span>
                              </span>
                            )}
                            {r.sourceUrl && (
                              <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer"
                                className="text-zinc-600 hover:text-orange-500 transition-colors">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        {r.expertScore !== null && (
                          <div className="w-full bg-[#27272a] rounded-full h-1">
                            <div
                              className="h-1 rounded-full bg-orange-500 transition-all"
                              style={{ width: `${(r.expertScore / 10) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="mt-4 pt-3 border-t border-[#27272a]">
          {shoe.buyUrl ? (
            <a
              href={shoe.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-xs font-semibold py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors"
            >
              Buy Now
            </a>
          ) : (
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${shoe.brand} ${shoe.model} buy UK`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-xs font-medium py-2.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 transition-colors"
            >
              Find Online
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
