/**
 * Newsletter subscriptions under UK PECR. Every subscribe records its basis and source:
 *   consent      an unticked box the person ticked, the footer form, "Yes please", the account toggle
 *   soft-opt-in  a pre-ticked box left ticked during a sale (shop checkout, FMR Club), recorded only
 *                after payment
 * The one hard rule: someone who unsubscribed is only ever subscribed again by consent, never by
 * a soft opt-in. Rules live here against an injected store, so they are tested without Prisma.
 */
import crypto from 'crypto';

export type Basis = 'consent' | 'soft-opt-in';
export type Source = 'signup-web' | 'signup-app' | 'checkout' | 'club' | 'prompt' | 'footer-confirmed';
export const SOURCES: readonly Source[] = ['signup-web', 'signup-app', 'checkout', 'club', 'prompt', 'footer-confirmed'];

export interface Subscriber {
  email: string;
  status: string; // active | unsubscribed
  token: string;
  basis: string | null;
  source: string | null;
  consented_at: Date | null;
  unsubscribed_at: Date | null;
}

export interface NewsletterStore {
  find: (email: string) => Promise<Subscriber | null>;
  findByToken: (token: string) => Promise<Subscriber | null>;
  create: (row: Subscriber) => Promise<void>;
  update: (email: string, patch: Partial<Subscriber>) => Promise<void>;
}

export type SubscribeResult = 'created' | 'resubscribed' | 'already' | 'kept-unsubscribed' | 'bad-email';

const normalise = (email: string) => email.trim().toLowerCase();
const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;

export async function subscribe(store: NewsletterStore, rawEmail: string, basis: Basis, source: Source, now = new Date()): Promise<SubscribeResult> {
  const email = normalise(rawEmail);
  if (!looksLikeEmail(email)) return 'bad-email';
  const existing = await store.find(email);
  if (!existing) {
    await store.create({ email, status: 'active', token: crypto.randomUUID(), basis, source, consented_at: now, unsubscribed_at: null });
    return 'created';
  }
  if (existing.status === 'active') {
    // Already on the list. Consent is the stronger record, so it replaces a soft opt-in.
    if (basis === 'consent' && existing.basis !== 'consent') await store.update(email, { basis, source, consented_at: now });
    return 'already';
  }
  // They unsubscribed. Only a fresh, active choice brings them back.
  if (basis !== 'consent') return 'kept-unsubscribed';
  await store.update(email, { status: 'active', basis, source, consented_at: now, unsubscribed_at: null });
  return 'resubscribed';
}

export async function unsubscribe(store: NewsletterStore, rawEmail: string, now = new Date()): Promise<boolean> {
  const email = normalise(rawEmail);
  const existing = await store.find(email);
  if (!existing || existing.status !== 'active') return false;
  await store.update(email, { status: 'unsubscribed', unsubscribed_at: now });
  return true;
}

/** The link in every email. 'done' also for an already-unsubscribed token (clicking twice is fine). */
export async function unsubscribeByToken(store: NewsletterStore, token: string, now = new Date()): Promise<'done' | 'already' | 'unknown'> {
  if (!token) return 'unknown';
  const row = await store.findByToken(token);
  if (!row) return 'unknown';
  if (row.status !== 'active') return 'already';
  await store.update(row.email, { status: 'unsubscribed', unsubscribed_at: now });
  return 'done';
}

export async function isSubscribed(store: NewsletterStore, rawEmail: string): Promise<boolean> {
  return (await store.find(normalise(rawEmail)))?.status === 'active';
}

/** An in-memory store, for tests. */
export function memoryStore(rows: Subscriber[] = []): NewsletterStore & { rows: Subscriber[] } {
  return {
    rows,
    find: async (email) => rows.find((r) => r.email === email) ?? null,
    findByToken: async (token) => rows.find((r) => r.token === token) ?? null,
    create: async (row) => void rows.push({ ...row }),
    update: async (email, patch) => {
      const r = rows.find((x) => x.email === email);
      if (r) Object.assign(r, patch);
    },
  };
}

/**
 * After a Stripe checkout: the pre-ticked box was left ticked, and the money has actually been
 * taken. Soft opt-in, with the email Stripe collected. Never throws: a sale must not fail over it.
 */
export async function subscribeAfterPayment(
  store: NewsletterStore,
  o: { email: string | null | undefined; paid: boolean; optedIn: boolean; source: 'checkout' | 'club' },
  now = new Date()
): Promise<SubscribeResult | 'skipped' | 'failed'> {
  if (!o.paid || !o.optedIn || !o.email) return 'skipped';
  try {
    return await subscribe(store, o.email, 'soft-opt-in', o.source, now);
  } catch (e) {
    console.error('Newsletter soft opt-in failed:', e);
    return 'failed';
  }
}

/**
 * The footer form. A new address subscribes at once (consent). An address that unsubscribed is
 * only brought back after it confirms by email (double opt-in): anyone can type anyone's address
 * into a form, and an unsubscribe must not be undone by someone else.
 */
export async function footerSubscribe(
  store: NewsletterStore,
  rawEmail: string,
  sendConfirm: (email: string) => Promise<unknown>,
  now = new Date()
): Promise<SubscribeResult | 'confirm-sent'> {
  const email = normalise(rawEmail);
  if (!looksLikeEmail(email)) return 'bad-email';
  const existing = await store.find(email);
  if (existing?.status === 'unsubscribed') {
    await sendConfirm(email);
    return 'confirm-sent';
  }
  return subscribe(store, email, 'consent', 'signup-web', now);
}

/** A signed, expiring confirmation link for footerSubscribe (no table needed). */
export function confirmToken(email: string, secret: string, expires: number): string {
  const sig = crypto.createHmac('sha256', secret).update(`${normalise(email)}|${expires}`).digest('base64url');
  return `${expires}.${sig}`;
}

export function checkConfirmToken(email: string, token: string, secret: string, now = Date.now()): boolean {
  const [exp, sig] = token.split('.');
  const expires = Number(exp);
  if (!Number.isFinite(expires) || expires < now || !sig) return false;
  const want = confirmToken(email, secret, expires).split('.')[1];
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
