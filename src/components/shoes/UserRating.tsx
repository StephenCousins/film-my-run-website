'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserRatingProps {
  shoeId: number;
  myRating: number | null;
  userAvgScore: number | null;
  userRatingCount: number;
  onRated: (myRating: number | null, userAvg: number | null, userCount: number) => void;
}

export default function UserRating({ shoeId, myRating, userAvgScore, userRatingCount, onRated }: UserRatingProps) {
  const { status } = useAuth();
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn = status === 'authenticated';

  const handleRate = async (score: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/shoes/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shoeId, score }),
      });
      if (res.ok) {
        const data = await res.json();
        onRated(data.rating, data.userAvg, data.userCount);
      }
    } finally {
      setSubmitting(false);
      setIsOpen(false);
    }
  };

  const handleRemove = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shoes/rate?shoeId=${shoeId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        onRated(null, data.userAvg, data.userCount);
      }
    } finally {
      setSubmitting(false);
      setIsOpen(false);
    }
  };

  const displayScore = hoveredScore ?? myRating;

  return (
    <div className="mt-2">
      {/* User average display */}
      {userRatingCount > 0 && userAvgScore !== null && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-xs font-medium text-[#52525b] dark:text-[#a1a1aa]">
            {userAvgScore.toFixed(1)}/10
          </span>
          <span className="text-xs text-[#a1a1aa]">
            ({userRatingCount} user{userRatingCount !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      {/* Rate button / current rating */}
      {isLoggedIn ? (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-xs font-medium transition-colors text-[#a1a1aa] hover:text-amber-500"
          >
            <Star className={`w-3.5 h-3.5 ${myRating ? 'text-amber-500 fill-amber-500' : ''}`} />
            {myRating ? `Your rating: ${myRating}/10` : 'Rate this shoe'}
          </button>

          {isOpen && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] rounded-xl shadow-lg z-20">
              <div className="flex gap-0.5 mb-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setHoveredScore(n)}
                    onMouseLeave={() => setHoveredScore(null)}
                    onClick={() => handleRate(n)}
                    disabled={submitting}
                    className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                      displayScore !== null && n <= displayScore
                        ? 'bg-amber-500 text-white'
                        : 'bg-[#f4f4f5] dark:bg-[#3f3f46] text-[#71717a] hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#a1a1aa]">
                  {hoveredScore ? `${hoveredScore}/10` : 'Select a score'}
                </span>
                {myRating && (
                  <button
                    onClick={handleRemove}
                    disabled={submitting}
                    className="text-[10px] text-red-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
