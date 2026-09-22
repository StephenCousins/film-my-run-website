/**
 * The Club: £2.99 a month or £29 a year, sold here rather than through the
 * App Store, and honoured everywhere because the account carries it
 * (members spec, 22 Sep 2026).
 */
export const CLUB_MONTHLY_PENCE = 299;
export const CLUB_YEARLY_PENCE = 2900;

/** Stripe subscription statuses that should unlock the Club. */
const LIVE = new Set(['active', 'trialing', 'past_due']);

export type SubscriptionFacts = {
  status: string;
  /** Unix seconds when the paid period ends. */
  currentPeriodEnd: number;
  cancelAtPeriodEnd?: boolean;
};

export type ClubAccess = { tier: 'PRO' | 'FREE'; until: Date | null };

/**
 * What an account should look like for a subscription. A cancelled-but-paid
 * subscription keeps the Club until the period ends: they paid for it.
 * `past_due` keeps it too — Stripe retries for days, and locking someone out
 * over a card that needs updating loses the member, not just the payment.
 */
export function accessFor(sub: SubscriptionFacts | null): ClubAccess {
  if (!sub || !LIVE.has(sub.status)) return { tier: 'FREE', until: null };
  return { tier: 'PRO', until: new Date(sub.currentPeriodEnd * 1000) };
}

/**
 * Never take away a longer entitlement than this subscription grants: Stephen
 * sets accounts PRO by hand with no end date, and a webhook must not undo it.
 */
export function mergeWithExisting(next: ClubAccess, existing: { tier: string; until: Date | null }): ClubAccess {
  const handSet = existing.tier === 'PRO' && existing.until === null;
  if (handSet) return { tier: 'PRO', until: null };
  if (next.tier === 'FREE') return next;
  if (existing.until && next.until && existing.until > next.until) return { tier: 'PRO', until: existing.until };
  return next;
}
