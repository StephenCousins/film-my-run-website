'use client';
/**
 * The member discount this visitor's checkout will actually apply, asked of the server (the
 * same rule as checkout), so a page never shows 15% to someone who will be charged 10%.
 * null until known. Also whether checkout will take £3 off one tee of their own type.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Answer = { rate: number | null; ownTypeOff: boolean };

// One request per signed-in identity per page, however many components ask.
let cached: { key: string; answer: Promise<Answer> } | null = null;
function fetchRate(key: string) {
  if (cached?.key !== key) {
    cached = {
      key,
      answer: fetch('/api/shop/rate', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : {}))
        .then((d: { rate?: number | null; ownTypeOff?: boolean }) => ({ rate: typeof d.rate === 'number' ? d.rate : null, ownTypeOff: d.ownTypeOff === true }))
        .catch(() => ({ rate: null, ownTypeOff: false })),
    };
  }
  return cached.answer;
}

function useShopAnswer(): Answer | null {
  const { status, user } = useAuth();
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    if (status === 'loading') return;
    let live = true;
    fetchRate(`${status}:${user?.email ?? ''}`).then((a) => live && setAnswer(a));
    return () => {
      live = false;
    };
  }, [status, user?.email]);
  return answer;
}

export function useShopRate(): number | null {
  return useShopAnswer()?.rate ?? null;
}

/** True once the server says checkout will take £3 off one tee of this member's own type. */
export function useOwnTypeOff(): boolean {
  return useShopAnswer()?.ownTypeOff ?? false;
}
