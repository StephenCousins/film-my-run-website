'use client';
/**
 * For signed-in members: the one-off "Get the weekly newsletter?" card (never again once
 * answered), and the account page's permanent toggle. Both use /api/members/newsletter.
 */
import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type State = { subscribed: boolean; asked: boolean } | null;

function useNewsletter() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<State>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/members/newsletter', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setState({ subscribed: d.subscribed, asked: d.asked }))
      .catch(() => {});
  }, [isAuthenticated]);
  const answer = async (subscribe: boolean) => {
    setBusy(true);
    try {
      const r = await fetch('/api/members/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscribe }) });
      const d = await r.json();
      if (d?.ok) setState({ subscribed: d.subscribed, asked: true });
    } finally {
      setBusy(false);
    }
  };
  return { state, busy, answer };
}

/** Shown once: not subscribed and never answered. */
export function NewsletterPrompt({ className = '' }: { className?: string }) {
  const { state, busy, answer } = useNewsletter();
  const [answered, setAnswered] = useState<boolean | null>(null);
  if (answered !== null) {
    return (
      <p className={`text-sm text-secondary ${className}`} role="status">
        {answered ? "Done. The next newsletter is on its way to you." : "No problem. We won't ask again."}
      </p>
    );
  }
  if (!state || state.subscribed || state.asked) return null;
  const go = async (yes: boolean) => {
    await answer(yes);
    setAnswered(yes);
  };
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface-secondary p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 text-brand shrink-0 mt-0.5" />
        <p className="text-foreground">
          <span className="font-semibold">Get the weekly Film My Run newsletter?</span>{' '}
          <span className="text-secondary">Race news, new films and the odd shop drop. Unsubscribe any time.</span>
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button type="button" disabled={busy} onClick={() => go(true)} className="px-5 py-2.5 rounded-full bg-brand text-black font-semibold hover:bg-orange-400 transition-colors disabled:opacity-60">
          Yes please
        </button>
        <button type="button" disabled={busy} onClick={() => go(false)} className="px-4 py-2.5 rounded-full text-secondary hover:text-foreground disabled:opacity-60">
          No thanks
        </button>
      </div>
    </div>
  );
}

/** The account page's permanent switch. */
export function NewsletterToggle({ className = '' }: { className?: string }) {
  const { state, busy, answer } = useNewsletter();
  if (!state) return null;
  return (
    <label className={`flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-secondary p-5 cursor-pointer ${className}`}>
      <span>
        <span className="block font-semibold text-foreground">Film My Run newsletter</span>
        <span className="block text-sm text-secondary">{state.subscribed ? 'You get it every week.' : "You don't get it."}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={state.subscribed}
        checked={state.subscribed}
        disabled={busy}
        onChange={(e) => answer(e.target.checked)}
        className="w-5 h-5 accent-[rgb(var(--color-brand))] cursor-pointer"
      />
    </label>
  );
}
