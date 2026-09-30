'use client';
/**
 * The member discount this visitor's checkout will actually apply, asked of the server (the
 * same rule as checkout), so a page never shows 15% to someone who will be charged 10%.
 * null until known.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// One request per signed-in identity per page, however many components ask.
let cached: { key: string; rate: Promise<number | null> } | null = null;
function fetchRate(key: string) {
  if (cached?.key !== key) {
    cached = {
      key,
      rate: fetch('/api/shop/rate', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { rate: null }))
        .then((d: { rate: number | null }) => (typeof d.rate === 'number' ? d.rate : null))
        .catch(() => null),
    };
  }
  return cached.rate;
}

export function useShopRate(): number | null {
  const { status, user } = useAuth();
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    if (status === 'loading') return;
    let live = true;
    fetchRate(`${status}:${user?.email ?? ''}`).then((r) => live && setRate(r));
    return () => {
      live = false;
    };
  }, [status, user?.email]);
  return rate;
}
