'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { memberPrice } from '@/lib/members/price';

/** "Members save 10% · Sign in" for guests; the member price for members (spec §3.1). */
export default function MemberLine({ pounds, label = 'Member price' }: { pounds: number; label?: string }) {
  const { isAuthenticated, status } = useAuth();
  const pathname = usePathname();
  if (status === 'loading') return null;
  if (!isAuthenticated) {
    return (
      <p className="text-sm text-secondary mt-1">
        Members save 10% · <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} className="text-brand hover:underline">Sign in</Link>
      </p>
    );
  }
  return <p className="text-sm text-foreground mt-1">{label} <span className="font-mono">£{memberPrice(pounds).toFixed(2)}</span></p>;
}
