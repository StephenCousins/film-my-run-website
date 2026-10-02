'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import NewsletterCheckbox from '@/components/newsletter/NewsletterCheckbox';
import { isAppleMobile, JOIN_IN_THE_APP } from '@/lib/club/apple-device';

const money = (pence: number) => `£${(pence / 100).toFixed(2).replace(/\.00$/, '')}`;

/**
 * The join button. Signing in comes first: the subscription has to attach to
 * an account, and that account is what carries the Club into the app.
 */
export default function JoinTheClub({ monthlyPence, yearlyPence }: { monthlyPence: number; yearlyPence: number }) {
  const { isAuthenticated, status, hasAccess } = useAuth();
  const [busy, setBusy] = useState<'month' | 'year' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Pre-ticked: a customer's soft opt-in (PECR). Subscribed only after payment, in the webhook.
  const [newsletter, setNewsletter] = useState(true);
  // Known only in the browser, so the first render waits for it rather than flashing the Stripe buttons.
  const [appleMobile, setAppleMobile] = useState<boolean | null>(null);
  useEffect(() => setAppleMobile(isAppleMobile(navigator.userAgent, navigator.maxTouchPoints)), []);

  const go = async (path: string, body?: unknown, key: 'month' | 'year' | 'portal' = 'portal') => {
    setBusy(key);
    setError(null);
    try {
      const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error ?? 'Something went wrong');
      window.location.href = d.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  if (status === 'loading' || appleMobile === null) return <div className="h-14" />;

  // See lib/club/apple-device.ts: no Stripe join on iPhone or iPad. Members keep their portal link below.
  if (appleMobile && !hasAccess('PRO')) {
    return <p className="text-lg text-foreground font-semibold">{JOIN_IN_THE_APP}</p>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <Link
          href="/login?callbackUrl=%2Fclub"
          className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-brand text-black font-semibold text-lg hover:bg-orange-400 transition-colors"
        >
          Sign in to join
        </Link>
        <p className="text-sm text-muted mt-3">
          A free account first, so FMR Club follows you into the app. {money(monthlyPence)} a month or {money(yearlyPence)} a year.
        </p>
      </div>
    );
  }

  if (hasAccess('PRO')) {
    return (
      <div>
        <p className="text-lg text-foreground font-semibold">You are in FMR Club. Thank you.</p>
        <button
          type="button"
          onClick={() => go('/api/club/portal')}
          disabled={busy !== null}
          className="mt-3 text-brand hover:underline disabled:opacity-60"
        >
          {busy ? 'Opening…' : 'Manage your membership'}
        </button>
        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => go('/api/club/checkout', { interval: 'month', newsletter }, 'month')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-brand text-black font-semibold text-lg hover:bg-orange-400 transition-colors disabled:opacity-60"
        >
          {busy === 'month' ? 'Taking you to Stripe…' : `Join for ${money(monthlyPence)} a month`}
        </button>
        <button
          type="button"
          onClick={() => go('/api/club/checkout', { interval: 'year', newsletter }, 'year')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center px-6 py-4 rounded-xl border border-border text-foreground font-medium hover:text-brand transition-colors disabled:opacity-60"
        >
          {busy === 'year' ? 'Taking you to Stripe…' : `or ${money(yearlyPence)} a year`}
        </button>
      </div>
      <p className="text-sm text-muted mt-3">A year works out at two months free. Cancel any time.</p>
      <NewsletterCheckbox
        className="mt-3"
        checked={newsletter}
        onChange={setNewsletter}
        label="Send me the Film My Run newsletter (untick if you'd rather not)"
      />
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}
