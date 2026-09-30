/**
 * GET/POST /api/members/newsletter: a signed-in member's newsletter status and their answer to
 * the one-off prompt (or the account toggle). Deps injected, so it is tested without Prisma.
 */
import type { Member } from '@/lib/members/handlers';

export type MemberNewsletterDeps = {
  member: (req: Request) => Promise<Member | null>;
  isSubscribed: (email: string) => Promise<boolean>;
  askedAt: (userId: number) => Promise<Date | null>;
  setAsked: (userId: number, at: Date) => Promise<void>;
  subscribe: (email: string) => Promise<unknown>;
  unsubscribe: (email: string) => Promise<unknown>;
  now?: () => Date;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });

/** GET → { ok, subscribed, asked }. `asked`: they have answered the prompt, either way. */
export async function handleGetNewsletter(req: Request, d: MemberNewsletterDeps): Promise<Response> {
  const m = await d.member(req);
  if (!m) return json({ ok: false, error: 'signed_out' }, 401);
  const [subscribed, askedAt] = await Promise.all([d.isSubscribed(m.email), d.askedAt(m.id)]);
  return json({ ok: true, subscribed, asked: askedAt !== null });
}

/** POST { subscribe: boolean } → { ok, subscribed, asked: true }. Yes is consent; No unsubscribes. */
export async function handlePostNewsletter(req: Request, d: MemberNewsletterDeps): Promise<Response> {
  const m = await d.member(req);
  if (!m) return json({ ok: false, error: 'signed_out' }, 401);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const want = (body as { subscribe?: unknown } | null)?.subscribe;
  if (typeof want !== 'boolean') return json({ ok: false, error: 'bad_request' }, 400);
  if (want) await d.subscribe(m.email);
  else await d.unsubscribe(m.email);
  await d.setAsked(m.id, d.now ? d.now() : new Date());
  return json({ ok: true, subscribed: await d.isSubscribed(m.email), asked: true });
}
