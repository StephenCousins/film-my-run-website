'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CLUB_DISCOUNT, MEMBER_DISCOUNT, memberPrice } from '@/lib/members/price';
import { CLUB_MONTHLY_PENCE } from '@/lib/club/subscription';

const pct = (d: number) => `${Math.round(d * 100)}%`;
const MEMBER = pct(MEMBER_DISCOUNT);
const CLUB = pct(CLUB_DISCOUNT);
const CLUB_MONTHLY = `£${(CLUB_MONTHLY_PENCE / 100).toFixed(2)}`;

function useMember(returnTo?: string) {
  const { isAuthenticated, status, hasAccess } = useAuth();
  const pathname = usePathname();
  return {
    loading: status === 'loading',
    signedIn: isAuthenticated,
    club: hasAccess('PRO'),
    signIn: `/login?callbackUrl=${encodeURIComponent(returnTo ?? pathname)}`,
  };
}

const clubLink = (
  <Link href="/club" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
    See FMR Club <ArrowRight className="w-3.5 h-3.5" />
  </Link>
);

/**
 * Under a price (product pages, basket): the member price for members; for guests, a small
 * card selling the free account and the Club, the same offer the app makes.
 */
export default function MemberLine({ pounds, label = 'Member price', returnTo }: { pounds: number; label?: string; returnTo?: string }) {
  const m = useMember(returnTo);
  if (m.loading) return null;
  if (!m.signedIn) {
    return (
      <div className="mt-3 rounded-xl border border-brand/30 bg-brand/5 p-3 sm:p-4">
        <p className="text-sm text-foreground">
          <span className="font-semibold">Save {MEMBER} with a free account</span>
          <span className="text-secondary">, or {CLUB} with FMR Club.</span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href={m.signIn} className="inline-flex items-center px-4 py-2 rounded-full bg-brand text-black font-semibold hover:bg-orange-400 transition-colors">
            Sign in free
          </Link>
          {clubLink}
        </div>
      </div>
    );
  }
  return (
    <>
      <p className="text-sm text-foreground mt-1">
        {label} <span className="font-mono">£{memberPrice(pounds, m.club).toFixed(2)}</span>
        {m.club && <span className="text-brand"> · FMR Club {CLUB}</span>}
      </p>
      {!m.club && (
        <p className="text-xs text-secondary mt-1">
          You save {MEMBER}. FMR Club members save {CLUB}. {clubLink}
        </p>
      )}
    </>
  );
}

/** The shop page's call to action: a bold card for guests, a slim line for members, nothing for the Club. */
export function MemberOffer({ className = 'mb-8' }: { className?: string }) {
  const m = useMember();
  if (m.loading || m.club) return null;
  if (m.signedIn) {
    return (
      <div className={`${className} flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-border bg-surface-secondary px-5 py-4`}>
        <p className="text-foreground">
          <span className="font-semibold">You save {MEMBER}.</span> FMR Club members save {CLUB}.
        </p>
        <span className="text-sm">{clubLink}</span>
      </div>
    );
  }
  return (
    <div className={`${className} rounded-2xl bg-brand text-black p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg`}>
      <div>
        <p className="font-display text-2xl sm:text-3xl font-bold leading-tight">Save {MEMBER} on every shirt</p>
        <p className="mt-2 text-black/80 text-base sm:text-lg">
          Free account. Or {CLUB} off with FMR Club for {CLUB_MONTHLY} a month.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 shrink-0">
        <Link href={m.signIn} className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-zinc-800 transition-colors">
          Sign in free
        </Link>
        <Link href="/club" className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-black/80 font-semibold hover:bg-black/10 transition-colors">
          See FMR Club
        </Link>
      </div>
    </div>
  );
}
