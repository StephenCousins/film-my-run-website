'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/track';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('fmr_sid');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('fmr_sid', id);
  }
  return id;
}

export default function Analytics() {
  const pathname = usePathname();
  const pageViewIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Skip bots
    if (typeof navigator !== 'undefined' && /bot|crawler|spider/i.test(navigator.userAgent)) {
      return;
    }

    const sessionId = getSessionId();
    pageViewIdRef.current = null;
    startTimeRef.current = Date.now();

    // Track page view
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        sessionId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.pageViewId) {
          pageViewIdRef.current = data.pageViewId;
        }
      })
      .catch(() => {
        // Silently fail — analytics should never break the site
      });
  }, [pathname]);

  // Send duration on page hide
  useEffect(() => {
    function sendDuration() {
      const pvId = pageViewIdRef.current;
      if (!pvId) return;
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (duration < 1) return;

      const payload = JSON.stringify({ pageViewId: pvId, duration });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/track',
          new Blob([payload], { type: 'application/json' }),
        );
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        sendDuration();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendDuration();
    };
  }, [pathname]);

  // Outbound clicks (affiliate and discount links, YouTube, Strava, race sites): one listener for the whole site.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !/^https?:/.test(a.href)) return;
      const url = new URL(a.href);
      if (url.host === location.host) return;
      track('outbound', url.host.replace(/^www\./, ''), a.href);
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
