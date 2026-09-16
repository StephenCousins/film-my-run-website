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
