import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ event: null as unknown, subscribed: [] as unknown[] }));
vi.mock('@/lib/shop/stripe', () => ({
  stripe: () => ({
    webhooks: { constructEvent: () => h.event },
    subscriptions: { retrieve: async () => ({ status: 'active', current_period_end: 4102444800, cancel_at_period_end: false }) },
  }),
}));
vi.mock('@/lib/db', () => ({
  prisma: { users: { findFirst: async () => ({ id: 1, access_tier: 'FREE', subscription_end: null }), update: async () => ({}) } },
}));
vi.mock('@/lib/newsletter/consent', () => ({
  subscribeAfterPayment: async (_s: unknown, o: unknown) => void h.subscribed.push(o),
}));
vi.mock('@/lib/newsletter/store', () => ({ liveNewsletterStore: {} }));

import { POST } from './route';

const session = (payment_status: string) => ({
  type: 'checkout.session.completed',
  data: {
    object: {
      mode: 'subscription',
      subscription: 'sub_1',
      customer: 'cus_1',
      client_reference_id: '1',
      payment_status,
      customer_details: { email: 'jo@example.com' },
      metadata: { user_id: '1', email: 'jo@example.com', newsletter: '1' },
    },
  },
});
const post = () => POST(new Request('https://filmmyrun.com/api/club/webhook/stripe', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'x' } }));

describe('Club webhook newsletter soft opt-in', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_CLUB_WEBHOOK_SECRET', 'whsec');
    h.subscribed = [];
  });
  it.each([
    ['paid', true],
    ['no_payment_required', true],
    ['unpaid', false],
  ])('payment_status %s → paid=%s', async (status, paid) => {
    h.event = session(status);
    expect((await post()).status).toBe(200);
    expect(h.subscribed).toEqual([{ email: 'jo@example.com', paid, optedIn: true, source: 'club' }]);
  });
});
