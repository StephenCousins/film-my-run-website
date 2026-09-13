'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface RateResult {
  rating: number;
  userAvg: number | null;
  userCount: number;
}

export interface RemoveResult {
  userAvg: number | null;
  userCount: number;
}

/**
 * The signed-in user's shoe ratings, keyed by shoe id. Loaded once per
 * sign-in from /api/shoes/my-ratings (the catalogue endpoint no longer
 * carries `myRating`), and kept in step by `rate` / `remove`, which return
 * the shoe's new user aggregate for the card to store.
 */
export function useShoeRatings() {
  const { status } = useAuth();
  const [ratings, setRatings] = useState<Record<number, number>>({});

  useEffect(() => {
    if (status !== 'authenticated') {
      setRatings({});
      return;
    }
    let live = true;
    fetch('/api/shoes/my-ratings')
      .then(r => (r.ok ? r.json() : { ratings: {} }))
      .then(d => {
        if (live) setRatings(d.ratings ?? {});
      })
      .catch(() => {
        if (live) setRatings({});
      });
    return () => {
      live = false;
    };
  }, [status]);

  // Both resolve to null on any failure (non-2xx or network) rather than throwing,
  // so the card can simply leave its numbers alone.
  const rate = useCallback(async (shoeId: number, score: number): Promise<RateResult | null> => {
    try {
      const res = await fetch('/api/shoes/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shoeId, score }),
      });
      if (!res.ok) return null;
      const d = (await res.json()) as RateResult;
      setRatings(r => ({ ...r, [shoeId]: d.rating }));
      return d;
    } catch {
      return null;
    }
  }, []);

  const remove = useCallback(async (shoeId: number): Promise<RemoveResult | null> => {
    try {
      const res = await fetch(`/api/shoes/rate?shoeId=${shoeId}`, { method: 'DELETE' });
      if (!res.ok) return null;
      const d = (await res.json()) as RemoveResult;
      setRatings(r => {
        const n = { ...r };
        delete n[shoeId];
        return n;
      });
      return d;
    } catch {
      return null;
    }
  }, []);

  return { ratings, rate, remove };
}
