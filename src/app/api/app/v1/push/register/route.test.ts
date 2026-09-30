import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const upsert = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ prisma: { push_devices: { upsert } } }));

import { POST } from './route';
import { registerSchema } from '@/lib/push/register-schema';

const token = 'ab12'.repeat(16);
const post = (body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/app/v1/push/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );

beforeEach(() => upsert.mockReset());

describe('registerSchema', () => {
  it('accepts a 64-hex token and parses news strings', () => {
    expect(registerSchema.parse({ token, environment: 'sandbox', news: 'false' }).news).toBe(false);
    expect(registerSchema.parse({ token, environment: 'production', news: 'true' }).news).toBe(true);
    expect(registerSchema.parse({ token, environment: 'production', news: true }).news).toBe(true);
  });
  it('rejects bad input', () => {
    const ok = { token, environment: 'sandbox', news: 'true' };
    expect(registerSchema.safeParse({ ...ok, token: 'ab12' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, token: 'zz'.repeat(40) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, environment: 'dev' }).success).toBe(false);
    expect(registerSchema.safeParse({ token, environment: 'sandbox' }).success).toBe(false);
  });
});

describe('POST /api/app/v1/push/register', () => {
  it('upserts and returns ok with no-store', async () => {
    upsert.mockResolvedValue({});
    const res = await post({ token, environment: 'sandbox', news: 'false' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(upsert).toHaveBeenCalledWith({
      where: { token },
      create: { token, environment: 'sandbox', news: false },
      update: { environment: 'sandbox', news: false, last_seen_at: expect.any(Date), invalid_at: null },
    });
  });
  it('400s on invalid input without touching prisma', async () => {
    const res = await post({ token: 'short', environment: 'sandbox', news: 'true' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: expect.any(String) });
    const bad = await POST(new NextRequest('http://localhost/x', { method: 'POST', body: 'nope' }));
    expect(bad.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});
