'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const KEY = 'fmr.welcomeOffer.seen';

/**
 * The 10% offer, once. It sells the free account rather than a one-off code:
 * membership already takes 10% off everything, for ever, and feeds the app —
 * so there is no second discount to build and nothing to stack.
 *
 * Shown only to a signed-out visitor, after a beat so it does not fight the
 * page in, and never again once dismissed or followed.
 */
export default function WelcomeOffer() {
  const { isAuthenticated, status } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading' || isAuthenticated) return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      return; // private window, blocked storage: rather show nothing than show it every time
    }
    const t = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(t);
  }, [isAuthenticated, status]);

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(KEY, '1'); } catch { /* nothing to remember it with */ }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 flex justify-center pointer-events-none">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="welcome-offer-title"
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-surface-secondary shadow-2xl p-5 relative"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 text-muted hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
        <p id="welcome-offer-title" className="font-display text-xl font-bold text-foreground pr-8">
          10% off, every order
        </p>
        <p className="text-sm text-secondary mt-2">
          A Film My Run account is free and takes 10% off everything in the shop — not just the first order.
          It keeps your order history too, and works in the app.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
            onClick={close}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-brand text-black font-semibold hover:bg-orange-400 transition-colors"
          >
            Get 10% off
          </Link>
          <button type="button" onClick={close} className="px-4 py-3 text-sm text-secondary hover:text-foreground">
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
