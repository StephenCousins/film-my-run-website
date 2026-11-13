import { describe, it, expect, vi } from 'vitest';
import { effectiveTier, refreshTokenTier, tierNeedsRefresh, TIER_REFRESH_MS, type TierRow, type TierToken } from './auth-tier';
import { toMember } from './members/store';

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/shop/stripe', () => ({ stripe: () => ({}) }));

const now = new Date('2026-11-13T12:00:00Z');
const later = new Date('2027-11-10T08:38:25Z');
const earlier = new Date('2026-01-01T00:00:00Z');

describe('effectiveTier', () => {
  it.each([
    ['PRO with a future end', 'PRO', later, 'PRO'],
    ['PRO whose end has passed', 'PRO', earlier, 'FREE'],
    ['PRO ending exactly now (already over)', 'PRO', now, 'FREE'],
    ['PRO with no end (hand-set)', 'PRO', null, 'PRO'],
    ['FREE', 'FREE', null, 'FREE'],
    ['FREE with an old end', 'FREE', earlier, 'FREE'],
  ] as const)('%s → %s', (_label, tier, end, want) => {
    expect(effectiveTier({ access_tier: tier, subscription_end: end }, now)).toBe(want);
  });

  it('agrees with toMember, the rule the app API uses', () => {
    for (const tier of ['FREE', 'PRO'] as const)
      for (const end of [null, earlier, now, later]) {
        const isPro = toMember({ id: 1, email: 'a@b.co', name: null, access_tier: tier, subscription_end: end }, now).proUntil !== null;
        expect(effectiveTier({ access_tier: tier, subscription_end: end }, now) === 'PRO').toBe(isPro);
      }
  });
});

describe('tierNeedsRefresh', () => {
  const t = now.getTime();
  it('trusts a recent check', () => expect(tierNeedsRefresh({ tierCheckedAt: t - TIER_REFRESH_MS + 1000 }, t)).toBe(false));
  it('re-reads once the interval has passed', () => expect(tierNeedsRefresh({ tierCheckedAt: t - TIER_REFRESH_MS }, t)).toBe(true));
  it('re-reads a token that has never been checked (cookies from before this change)', () => expect(tierNeedsRefresh({}, t)).toBe(true));
  it('always re-reads on update()', () => expect(tierNeedsRefresh({ tierCheckedAt: t }, t, 'update')).toBe(true));
});

describe('refreshTokenTier', () => {
  const row = (r: Partial<TierRow> = {}): TierRow => ({ id: 24, access_tier: 'PRO', subscription_end: later, ...r });
  const loader = (r: TierRow | null = row()) => vi.fn(async () => r);

  it('does not query the database while the last check is fresh', async () => {
    const load = loader();
    const token: TierToken = { id: '24', accessTier: 'FREE', tierCheckedAt: now.getTime() - 60_000 };
    await refreshTokenTier(token, { load, now });
    expect(load).not.toHaveBeenCalled();
    expect(token.accessTier).toBe('FREE');
  });

  it('queries by id once the interval has passed, and picks up a new Club payment', async () => {
    const load = loader();
    const token: TierToken = { id: '24', email: 'x@y.z', accessTier: 'FREE', tierCheckedAt: now.getTime() - TIER_REFRESH_MS - 1 };
    await refreshTokenTier(token, { load, now });
    expect(load).toHaveBeenCalledWith({ id: 24 });
    expect(token).toMatchObject({ accessTier: 'PRO', subscriptionEnd: later.toISOString(), tierCheckedAt: now.getTime() });
  });

  it('queries at once on update(), even if just checked', async () => {
    const load = loader();
    const token: TierToken = { id: '24', accessTier: 'FREE', tierCheckedAt: now.getTime() };
    await refreshTokenTier(token, { load, now, trigger: 'update' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(token.accessTier).toBe('PRO');
  });

  it('turns an ended Club into FREE', async () => {
    const token: TierToken = { id: '24', accessTier: 'PRO' };
    await refreshTokenTier(token, { load: loader(row({ subscription_end: earlier })), now });
    expect(token.accessTier).toBe('FREE');
  });

  it('on sign-in, reads the database rather than trusting a raw PRO column', async () => {
    const token: TierToken = { email: 'x@y.z' };
    const load = loader(row({ subscription_end: earlier }));
    await refreshTokenTier(token, { load, now, signedIn: { id: '24', accessTier: 'PRO' } });
    expect(load).toHaveBeenCalledWith({ id: 24 });
    expect(token).toMatchObject({ id: '24', accessTier: 'FREE' });
  });

  it('on sign-in, keeps a hand-set PRO with no end', async () => {
    const token: TierToken = {};
    await refreshTokenTier(token, { load: loader(row({ subscription_end: null })), now, signedIn: { id: '1', accessTier: 'PRO' } });
    expect(token).toMatchObject({ accessTier: 'PRO', subscriptionEnd: null });
  });

  it('falls back to email when there is no usable id', async () => {
    const load = loader();
    await refreshTokenTier({ email: 'x@y.z' }, { load, now });
    expect(load).toHaveBeenCalledWith({ email: 'x@y.z' });
  });

  it('keeps the token as it was if the database fails, and tries again next time', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const token: TierToken = { id: '24', accessTier: 'PRO', tierCheckedAt: 0 };
    await refreshTokenTier(token, { load: vi.fn(async () => { throw new Error('down'); }), now });
    expect(token).toMatchObject({ accessTier: 'PRO', tierCheckedAt: 0 });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('@');
    spy.mockRestore();
  });
});
