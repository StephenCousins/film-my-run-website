import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Member } from '@/lib/members/handlers';

const current = vi.hoisted(() => ({ value: { member: null as Member | null, hadBearer: false, pro: false } }));
vi.mock('@/lib/members/current', () => ({ currentMember: async () => current.value }));

import { GET } from './route';

const member = (proUntil: string | null): Member => ({ id: 1, email: 's@example.com', name: 'S', proUntil });
const rate = async () => (await (await GET(new Request('http://localhost/api/shop/rate'))).json()).rate;

describe('GET /api/shop/rate: the discount checkout will give', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.stubEnv('STRIPE_MEMBER_COUPON', 'MEMBER10');
    vi.stubEnv('STRIPE_CLUB_COUPON', 'CLUB15');
  });

  it('guest 0, member 10%, Club 15%', async () => {
    current.value = { member: null, hadBearer: false, pro: false };
    expect(await rate()).toBe(0);
    current.value = { member: member(null), hadBearer: false, pro: false };
    expect(await rate()).toBe(0.1);
    current.value = { member: member('2099-01-01T00:00:00Z'), hadBearer: false, pro: false };
    expect(await rate()).toBe(0.15);
  });

  it('a hand-set PRO account (no end date) is Club, as toMember makes it', async () => {
    const { toMember } = await import('@/lib/members/store');
    current.value = {
      member: toMember({ id: 1, email: 's@example.com', name: 'S', access_tier: 'PRO', subscription_end: null } as never),
      hadBearer: false,
      pro: false,
    };
    expect(await rate()).toBe(0.15);
  });

  it('a lapsed Club member, or a missing Club coupon, gets 10%: what they will actually pay', async () => {
    current.value = { member: member(null), hadBearer: false, pro: false };
    expect(await rate()).toBe(0.1);
    vi.stubEnv('STRIPE_CLUB_COUPON', undefined);
    current.value = { member: member('2099-01-01T00:00:00Z'), hadBearer: false, pro: false };
    expect(await rate()).toBe(0.1);
  });

  it('no coupons configured: 0 for everyone', async () => {
    vi.stubEnv('STRIPE_MEMBER_COUPON', undefined);
    vi.stubEnv('STRIPE_CLUB_COUPON', undefined);
    current.value = { member: member('2099-01-01T00:00:00Z'), hadBearer: false, pro: false };
    expect(await rate()).toBe(0);
  });
});
