'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useShoeList, type Shoe, type ShoeReview } from './ShoeFinderClient';
import ShoePlaceholder from './ShoePlaceholder';
import UserRating from './UserRating';

const TERRAIN_COLORS: Record<string, string> = {
  road: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  trail: 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400',
  both: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400',
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 9 ? 'bg-green-500' : score >= 8 ? 'bg-orange-500' : score >= 7 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="w-full bg-[#e4e4e7] dark:bg-[#27272a] rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${(score / 10) * 100}%` }}
      />
    </div>
  );
}

type ReviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; reviews: ShoeReview[] }
  | { status: 'error' };

export default function ShoeCard({ shoe, rank }: { shoe: Shoe; rank: number | null }) {
  const { ratings, rate, remove, labels } = useShoeList();
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  // Per-card aggregates change when this user rates; the rating itself comes from the shared hook.
  const [userAvgScore, setUserAvgScore] = useState(shoe.userAvgScore);
  const [userRatingCount, setUserRatingCount] = useState(shoe.userRatingCount);
  const [reviewState, setReviewState] = useState<ReviewState>({ status: 'idle' });
  const myRating = ratings[shoe.id] ?? null;
  const hasReviews = shoe.reviewCount > 0;

  // The list payload carries no reviews; fetch them once, on first expand,
  // and keep them for the card's lifetime. A ref tracks the fetch rather
  // than `reviewState` sitting in the deps: with the status there the effect
  // re-ran as it flipped to 'loading' and the cleanup discarded its own fetch.
  const reviewFetch = useRef<'pending' | 'done' | null>(null);
  useEffect(() => {
    if (!expanded || reviewFetch.current !== null) return;
    reviewFetch.current = 'pending';
    let live = true;
    setReviewState({ status: 'loading' });
    fetch(`/api/shoes/${encodeURIComponent(shoe.slug)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => {
        if (!live) return;
        reviewFetch.current = 'done';
        setReviewState({ status: 'loaded', reviews: Array.isArray(d.reviews) ? d.reviews : [] });
      })
      .catch(() => {
        if (!live) return;
        reviewFetch.current = null; // the next expand retries
        setReviewState({ status: 'error' });
      });
    return () => {
      live = false;
      if (reviewFetch.current === 'pending') reviewFetch.current = null;
    };
  }, [expanded, shoe.slug]);

  const scoreColor =
    shoe.avgScore === null
      ? 'text-[#a1a1aa]'
      : shoe.avgScore >= 9
        ? 'text-green-600 dark:text-green-400'
        : shoe.avgScore >= 8
          ? 'text-orange-500'
          : shoe.avgScore >= 7
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-[#52525b] dark:text-[#a1a1aa]';

  return (
    <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl overflow-hidden hover:border-orange-300 dark:hover:border-orange-800 transition-colors">
      {/* Image / placeholder */}
      <div className="relative bg-[#f4f4f5] dark:bg-[#27272a] h-40 flex items-center justify-center">
        {shoe.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shoe.imageUrl}
            alt={`${shoe.brand} ${shoe.model}`}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <ShoePlaceholder brand={shoe.brand} />
        )}

        {/* Rank badge */}
        {rank !== null && shoe.avgScore !== null && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center">
            #{rank}
          </div>
        )}

        {/* Terrain badge */}
        <span
          className={`absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${TERRAIN_COLORS[shoe.terrain] ?? ''}`}
        >
          {shoe.terrain}
        </span>

        {/* Superseded tag: only visible when "Show previous versions" is on */}
        {shoe.supersededBySlug && (
          <span
            className="absolute bottom-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#18181b]/70 text-[#fafafa] dark:bg-[#fafafa]/80 dark:text-[#18181b]"
            title="A newer version of this shoe is in the catalogue"
          >
            Superseded
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Brand + model */}
        <p className="text-xs text-[#71717a] dark:text-[#71717a] font-medium uppercase tracking-wide">
          {shoe.brand}
        </p>
        <h3 className="font-semibold text-[#18181b] dark:text-[#fafafa] text-base leading-tight mt-0.5">
          {shoe.model}
        </h3>

        {/* Score */}
        <div className="flex items-end gap-2 mt-3">
          <span className={`text-3xl font-bold font-mono leading-none ${scoreColor}`}>
            {shoe.avgScore !== null ? shoe.avgScore.toFixed(1) : '—'}
          </span>
          {shoe.avgScore !== null && (
            <span className="text-xs text-[#a1a1aa] mb-1 leading-none">/10</span>
          )}
          {shoe.reviewCount > 0 && (
            <span className="text-xs text-[#a1a1aa] mb-1 leading-none ml-auto">
              {shoe.reviewCount} source{shoe.reviewCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {shoe.avgScore !== null && <ScoreBar score={shoe.avgScore} />}

        <UserRating
          shoeId={shoe.id}
          myRating={myRating}
          userAvgScore={userAvgScore}
          userRatingCount={userRatingCount}
          onRate={async score => {
            const d = await rate(shoe.id, score);
            if (d) {
              setUserAvgScore(d.userAvg);
              setUserRatingCount(d.userCount);
            }
            return d;
          }}
          onRemove={async () => {
            const d = await remove(shoe.id);
            if (d) {
              setUserAvgScore(d.userAvg);
              setUserRatingCount(d.userCount);
            }
            return d;
          }}
        />

        {/* Category + specs */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs bg-[#f4f4f5] dark:bg-[#27272a] text-[#52525b] dark:text-[#a1a1aa] px-2 py-0.5 rounded-md">
            {labels.categories[shoe.category] ?? shoe.category}
          </span>
          {shoe.dropMm !== null && (
            <span className="text-xs bg-[#f4f4f5] dark:bg-[#27272a] text-[#52525b] dark:text-[#a1a1aa] px-2 py-0.5 rounded-md">
              {shoe.dropMm}mm drop
            </span>
          )}
          {shoe.weightG !== null && (
            <span className="text-xs bg-[#f4f4f5] dark:bg-[#27272a] text-[#52525b] dark:text-[#a1a1aa] px-2 py-0.5 rounded-md">
              {shoe.weightG}g
            </span>
          )}
        </div>

        {/* Description */}
        {shoe.description && (
          <p className="text-xs text-[#71717a] dark:text-[#71717a] mt-2.5 line-clamp-2 leading-relaxed">
            {shoe.description}
          </p>
        )}

        {/* Expand reviews */}
        {hasReviews && (
          <>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 mt-3 transition-colors font-medium"
            >
              Review breakdown
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-2.5">
                    {reviewState.status === 'error' && (
                      <p className="text-xs text-[#a1a1aa]">Couldn&apos;t load reviews</p>
                    )}
                    {(reviewState.status === 'loading' || reviewState.status === 'idle') &&
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-1.5 animate-pulse">
                          <div className="h-3 w-1/3 rounded bg-[#f4f4f5] dark:bg-[#27272a]" />
                          <div className="h-1.5 w-full rounded-full bg-[#f4f4f5] dark:bg-[#27272a]" />
                        </div>
                      ))}
                    {reviewState.status === 'loaded' && reviewState.reviews.length === 0 && (
                      <p className="text-xs text-[#a1a1aa]">No reviews yet</p>
                    )}
                    {reviewState.status === 'loaded' && reviewState.reviews.map(r => (
                      <div key={r.source}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#52525b] dark:text-[#a1a1aa]">
                            {labels.sources[r.source] ?? r.source}
                          </span>
                          <div className="flex items-center gap-2">
                            {r.expertScore !== null && (
                              <span className="text-xs font-bold text-[#18181b] dark:text-[#fafafa]">
                                {r.expertScore.toFixed(1)}
                                <span className="text-[#a1a1aa] font-normal">/10</span>
                              </span>
                            )}
                            {r.sourceUrl && (
                              <a
                                href={r.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#a1a1aa] hover:text-orange-500 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        {r.expertScore !== null && <ScoreBar score={r.expertScore} />}
                        {r.summary && (
                          <p className="text-xs text-[#a1a1aa] mt-1 italic line-clamp-2">{r.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-[#f4f4f5] dark:border-[#27272a] flex gap-2">
          {shoe.buyUrl ? (
            <a
              href={shoe.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            >
              Buy now
            </a>
          ) : (
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${shoe.brand} ${shoe.model} buy UK`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-[#f4f4f5] dark:bg-[#27272a] text-[#52525b] dark:text-[#a1a1aa] hover:bg-[#e4e4e7] dark:hover:bg-[#3f3f46] transition-colors"
            >
              Find online
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
