import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({ users: new Map<string, unknown>(), store: null as unknown }));
vi.mock('@/lib/db', () => ({
  prisma: {
    users: {
      findFirst: async ({ where }: { where: { email: { equals: string } } }) => h.users.get(where.email.equals.toLowerCase()) ?? null,
      create: async ({ data }: { data: { email: string } }) => void h.users.set(data.email, data),
    },
  },
}));
vi.mock('@/lib/auth', () => ({ hashPassword: async () => 'hash' }));
vi.mock('@/lib/newsletter/store', async () => {
  const { memoryStore } = await import('@/lib/newsletter/consent');
  h.store = memoryStore();
  return { liveNewsletterStore: h.store };
});

import { POST } from './route';
import type { Subscriber } from '@/lib/newsletter/consent';

const rows = () => (h.store as { rows: Subscriber[] }).rows;
const register = (body: object) =>
  POST(new NextRequest('https://filmmyrun.com/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Jo Bloggs', password: 'Abcdefghij1!', ...body }) }));

describe('POST /api/auth/register newsletter box', () => {
  beforeEach(() => {
    h.users.clear();
    rows().length = 0;
  });

  it('ticked: a new account is subscribed with consent, source signup-web', async () => {
    expect((await register({ email: 'jo@example.com', newsletter: true })).status).toBe(200);
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ email: 'jo@example.com', basis: 'consent', source: 'signup-web', status: 'active' });
  });

  it('unticked or missing: no subscription', async () => {
    await register({ email: 'a@example.com', newsletter: false });
    await register({ email: 'b@example.com' });
    expect(rows()).toHaveLength(0);
  });

  it('an email that already has an account is not subscribed (no enumeration, no signing others up)', async () => {
    h.users.set('taken@example.com', { email: 'taken@example.com' });
    expect((await register({ email: 'taken@example.com', newsletter: true })).status).toBe(200);
    expect(rows()).toHaveLength(0);
  });
});
