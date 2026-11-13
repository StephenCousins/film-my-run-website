import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ event: null as unknown, fulfilled: [] as unknown[] }));
vi.mock('@/lib/shop/stripe', () => ({ stripe: () => ({ webhooks: { constructEvent: () => h.event } }) }));
vi.mock('@/lib/db', () => ({ prisma: { orders: { findFirst: async () => null } } }));
vi.mock('@/lib/newsletter/consent', () => ({ subscribeAfterPayment: async () => {} }));
vi.mock('@/lib/newsletter/store', () => ({ liveNewsletterStore: {} }));
vi.mock('@/lib/shop/fulfil', async (orig) => ({
  ...(await orig<typeof import('@/lib/shop/fulfil')>()),
  fulfilPaidSession: async (id: string) => {
    h.fulfilled.push(id);
    return 'unknown-session';
  },
}));
// Heavy modules the fulfilment path imports; never reached here.
vi.mock('@/lib/shop/printify', () => ({ createOrder: async () => '' }));
vi.mock('@/lib/shop/contrado', () => ({ createContradoOrder: async () => '' }));
vi.mock('@/lib/shop/email', () => ({ orderConfirmation: async () => {}, orderFailed: async () => {}, orderNotSaved: async () => {} }));
vi.mock('@/lib/shop/runner-tee-print', () => ({ printifyLineItems: async () => [], printKey: () => '' }));
vi.mock('@/lib/runner-quiz/render', () => ({ renderPng: async () => Buffer.from(''), logoDataUri: '' }));
vi.mock('@/lib/r2', () => ({ uploadToR2: async () => {}, getR2Url: () => '' }));

import { POST } from './route';

const shipping = { name: 'Jo Runner', address: { line1: '1 Track Lane', city: 'Leeds', postal_code: 'LS1 1AA', country: 'GB' } };
const completed = (object: Record<string, unknown>) => ({ type: 'checkout.session.completed', created: 1790000000, data: { object: { id: 'cs_1', ...object } } });
const post = () => POST(new Request('https://filmmyrun.com/api/shop/webhook/stripe', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'x' } }));

describe('shop webhook: which checkouts it handles', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec');
    h.fulfilled = [];
  });

  it('ignores an FMR Club (subscription) checkout with a 200, so Stripe stops retrying', async () => {
    h.event = completed({ mode: 'subscription', customer_details: { email: 'jo@example.com' } });
    const r = await post();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ignored: 'subscription' });
    expect(h.fulfilled).toEqual([]);
  });

  it('still fulfils a shop basket with an email and a shipping address', async () => {
    h.event = completed({ mode: 'payment', payment_status: 'paid', customer_details: { email: 'jo@example.com' }, collected_information: { shipping_details: shipping }, shipping_details: shipping });
    const r = await post();
    expect(r.status).toBe(200);
    expect(h.fulfilled).toEqual(['cs_1']);
  });

  it('still answers 400 for a shop basket missing its shipping address, so Stripe retries it', async () => {
    h.event = completed({ mode: 'payment', customer_details: { email: 'jo@example.com' } });
    const r = await post();
    expect(r.status).toBe(400);
    expect(h.fulfilled).toEqual([]);
  });
});
