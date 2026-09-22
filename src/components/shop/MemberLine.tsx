'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { memberPrice } from '@/lib/members/price';

/**
 * "Members save 10% · Sign in" for guests; the member price for members
 * (spec §3.1). A Club subscriber saves 15%, and a plain member is told so.
 */
export default function MemberLine({ pounds, label = 'Member price' }: { pounds: number; label?: string }) {
  const { isAuthenticated, status, hasAccess } = useAuth();
  const pathname = usePathname();
  if (status === 'loading') return null;
  if (!isAuthenticated) {
    return (
      <p className="text-sm text-secondary mt-1">
        Members save 10% · <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} className="text-brand hover:underline">Sign in</Link>
      </p>
    );
  }
  const club = hasAccess('PRO');
  return (
    <>
      <p className="text-sm text-foreground mt-1">
        {label} <span className="font-mono">£{memberPrice(pounds, club).toFixed(2)}</span>
        {club && <span className="text-brand"> · Club 15%</span>}
      </p>
      {/* No link yet: the Club is only sold in the app, so there is nowhere on
          the site to send them. Add one when web checkout for it exists. */}
      {!club && <p className="text-xs text-muted mt-0.5">Club members save 15%.</p>}
    </>
  );
}
