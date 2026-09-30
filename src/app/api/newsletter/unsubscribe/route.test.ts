import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@/lib/newsletter/store', async () => {
  const { memoryStore } = await import('@/lib/newsletter/consent');
  store.value = memoryStore();
  return { liveNewsletterStore: store.value };
});

import { GET, POST } from './route';
import { subscribe, type NewsletterStore, type Subscriber } from '@/lib/newsletter/consent';

describe('unsubscribe link', () => {
  it('one-click POST (RFC 8058) and the GET link both unsubscribe', async () => {
    const s = store.value as NewsletterStore & { rows: Subscriber[] };
    await subscribe(s, 'a@x.com', 'soft-opt-in', 'checkout');
    await subscribe(s, 'b@x.com', 'consent', 'signup-app');
    const [a, b] = s.rows;
    const res = await POST(new NextRequest(`https://filmmyrun.com/api/newsletter/unsubscribe?token=${a.token}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' }));
    expect(res.status).toBe(200);
    expect(a.status).toBe('unsubscribed');
    const page = await GET(new NextRequest(`https://filmmyrun.com/api/newsletter/unsubscribe?token=${b.token}`));
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('successfully unsubscribed');
    expect(b.status).toBe('unsubscribed');
    expect((await POST(new NextRequest('https://filmmyrun.com/api/newsletter/unsubscribe?token=nope', { method: 'POST' }))).status).toBe(404);
  });
});
