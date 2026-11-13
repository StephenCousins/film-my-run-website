import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('./db', () => ({ prisma: { users: { findUnique: h.findUnique } } }));
vi.mock('./prisma-adapter-int', () => ({ PrismaAdapterWithIntIds: () => ({}) }));

import { authOptions } from './auth';
import { TIER_REFRESH_MS } from './auth-tier';

type JwtArgs = Parameters<NonNullable<NonNullable<typeof authOptions.callbacks>['jwt']>>[0];
const jwt = (args: Partial<JwtArgs>) => authOptions.callbacks!.jwt!({ token: {}, ...args } as JwtArgs);

describe('NextAuth jwt callback keeps the Club tier fresh', () => {
  beforeEach(() => {
    h.findUnique.mockReset();
    h.findUnique.mockResolvedValue({ id: 24, access_tier: 'PRO', subscription_end: new Date(Date.now() + 365 * 864e5) });
  });

  it('a FREE cookie becomes PRO on update() after the Club webhook has run', async () => {
    const token = await jwt({ token: { id: '24', accessTier: 'FREE', tierCheckedAt: Date.now() } as JwtArgs['token'], trigger: 'update' });
    expect(h.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 24 } }));
    expect(token.accessTier).toBe('PRO');
  });

  it('does not touch the database on an ordinary request inside the interval', async () => {
    await jwt({ token: { id: '24', accessTier: 'FREE', tierCheckedAt: Date.now() } as JwtArgs['token'] });
    expect(h.findUnique).not.toHaveBeenCalled();
  });

  it('re-reads after the interval, and copies the result onto the session', async () => {
    const token = await jwt({ token: { id: '24', accessTier: 'FREE', tierCheckedAt: Date.now() - TIER_REFRESH_MS - 1 } as JwtArgs['token'] });
    expect(h.findUnique).toHaveBeenCalledTimes(1);
    const session = await authOptions.callbacks!.session!({ session: { user: {} }, token } as never);
    expect(session.user).toMatchObject({ id: '24', accessTier: 'PRO' });
  });
});
