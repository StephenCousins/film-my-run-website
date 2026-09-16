import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * Gate for the "Ask Stephen" admin inbox (spec §3, "Admin inbox"): a
 * NextAuth session whose email equals CHAT_ADMIN_EMAIL. Callers use this to
 * 404 (not 403) so the URL reveals nothing to anyone else.
 */
export function isChatAdmin(session: { user?: { email?: string | null } } | null | undefined): boolean {
  const adminEmail = (process.env.CHAT_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!adminEmail) return false;
  const sessionEmail = session?.user?.email;
  if (!sessionEmail) return false;
  return sessionEmail.toLowerCase() === adminEmail;
}

/**
 * For an admin page's `generateMetadata`. The root `loading.tsx` streams the
 * shell (status 200, resolved metadata) before the page body runs, so the
 * page's own `notFound()` cannot stop the inbox's title reaching an anonymous
 * visitor. Metadata is resolved ahead of the shell, so gating it here makes
 * that request a real 404 with nothing to read. Pages keep their own check too.
 */
export function chatAdminMetadata(
  session: { user?: { email?: string | null } } | null | undefined,
  title: string,
  deny: () => never = notFound,
): Metadata {
  if (!isChatAdmin(session)) deny();
  return { title, robots: { index: false, follow: false } };
}
