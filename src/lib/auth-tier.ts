/**
 * Keeps FMR Club access fresh in the website's sign-in cookie.
 *
 * The website signs people in with a NextAuth JWT cookie, and that cookie carries the
 * account's tier. Before Nov 2026 the tier was only copied in at sign-in, so someone who
 * paid for the Club after signing in still looked free until they signed out and in again
 * (Dave Westhead, 10 Nov 2026). Now the tier is re-read from the database every few
 * minutes, and straight away when the page asks for it (`useSession().update()`).
 *
 * The rule for "is this person in the Club" is the same as `toMember` in
 * `members/store.ts`, which the app API uses: PRO with no end date is hand-set and
 * lasts for ever; PRO with an end date counts only while that date is still ahead;
 * anything else is not Club. An ended Club membership shows as FREE here, without
 * writing anything to the database.
 *
 * The app API (`/api/app/v1/*`) does not use this cookie: it reads the database on
 * every request through `memberForToken` → `toMember`, so it was never stale.
 */

export type AccessTier = 'FREE' | 'PREMIUM' | 'PRO';

/** How long a tier read from the database is trusted before it is read again. */
export const TIER_REFRESH_MS = 2 * 60 * 1000;

export type TierRow = { id: number; access_tier: AccessTier; subscription_end: Date | null };

/** The tier the website should act on: a PRO whose paid period has ended is FREE. */
export function effectiveTier(row: Pick<TierRow, 'access_tier' | 'subscription_end'>, now = new Date()): AccessTier {
  if (row.access_tier !== 'PRO') return row.access_tier;
  if (!row.subscription_end) return 'PRO'; // hand-set, for ever
  return row.subscription_end > now ? 'PRO' : 'FREE';
}

/** The bits of the NextAuth token this module reads and writes. */
export type TierToken = {
  id?: string;
  email?: string | null;
  accessTier?: AccessTier;
  subscriptionEnd?: string | null;
  /** When the tier was last read from the database (milliseconds since 1970). */
  tierCheckedAt?: number;
};

/** True when the token's tier should be read from the database again. */
export function tierNeedsRefresh(token: TierToken, now: number, trigger?: string): boolean {
  if (trigger === 'update') return true;
  if (typeof token.tierCheckedAt !== 'number') return true;
  return now - token.tierCheckedAt >= TIER_REFRESH_MS;
}

export type LoadUser = (by: { id: number } | { email: string }) => Promise<TierRow | null>;

/**
 * Runs inside the NextAuth `jwt` callback. On sign-in (`signedIn` set) it always reads
 * the database; after that only when the last read is older than TIER_REFRESH_MS, or
 * when `trigger` is 'update'. Changes the token in place and returns it.
 */
export async function refreshTokenTier<T extends TierToken>(
  token: T,
  opts: { load: LoadUser; now?: Date; trigger?: string; signedIn?: { id: string; accessTier?: AccessTier } },
): Promise<T> {
  const now = opts.now ?? new Date();
  if (opts.signedIn) {
    token.id = opts.signedIn.id;
    // A stand-in until the database read below; never PRO, in case that Club has ended.
    token.accessTier = opts.signedIn.accessTier === 'PRO' ? 'FREE' : opts.signedIn.accessTier ?? 'FREE';
    token.tierCheckedAt = undefined;
  }
  if (!tierNeedsRefresh(token, now.getTime(), opts.trigger)) return token;

  const id = Number(token.id);
  const by = Number.isInteger(id) && id > 0 ? { id } : token.email ? { email: token.email } : null;
  if (!by) return token;

  try {
    const row = await opts.load(by);
    if (row) {
      token.id = String(row.id);
      token.accessTier = effectiveTier(row, now);
      token.subscriptionEnd = row.subscription_end ? row.subscription_end.toISOString() : null;
    }
    token.tierCheckedAt = now.getTime();
  } catch (e) {
    // Keep what the token had and try again on the next request. No email in the log.
    console.error('Could not refresh the access tier for user', token.id, (e as Error).message);
  }
  return token;
}
