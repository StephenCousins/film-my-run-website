import { describe, it, expect, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ prisma: { newsletter_subscribers: { create } } }));

import { liveNewsletterStore } from './store';

const row = { email: 'a@x.com', status: 'active', token: 't', basis: 'consent', source: 'prompt', consented_at: new Date(), unsubscribed_at: null };

describe('liveNewsletterStore.create', () => {
  it('a duplicate email (P2002, a concurrent retry) counts as already there, never a 500', async () => {
    create.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));
    await expect(liveNewsletterStore.create(row)).resolves.toBeUndefined();
  });
  it('any other database error still throws', async () => {
    create.mockRejectedValueOnce(Object.assign(new Error('connection lost'), { code: 'P1001' }));
    await expect(liveNewsletterStore.create(row)).rejects.toThrow('connection lost');
  });
});
