import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({ issue: null as unknown }));
vi.mock('@/lib/db', () => ({ prisma: { newsletter_issues: { findUnique: async () => h.issue } } }));

import { GET } from './route';

const get = (query = '') =>
  GET(new NextRequest(`https://filmmyrun.com/api/newsletter/view/52${query}`), { params: Promise.resolve({ id: '52' }) });

describe('/api/newsletter/view/[id]', () => {
  beforeEach(() => {
    h.issue = { id: 52, status: 'sent', approve_token: 'tok', content: { subject: 'Monday news', intro: 'Hello all' } };
  });

  it('shows a sent issue to anyone', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Hello all');
  });

  it('shows an issue that is part-way through sending', async () => {
    h.issue = { ...(h.issue as object), status: 'sending' };
    expect((await get()).status).toBe(200);
  });

  it('hides a draft unless the review token is given', async () => {
    h.issue = { ...(h.issue as object), status: 'draft' };
    expect((await get()).status).toBe(404);
    expect((await get('?token=wrong')).status).toBe(404);
    expect((await get('?token=tok')).status).toBe(200);
  });

  it('a draft with no token at all stays hidden, even with an empty token', async () => {
    h.issue = { ...(h.issue as object), status: 'draft', approve_token: null };
    expect((await get('?token=')).status).toBe(404);
  });

  it('unknown or bad ids', async () => {
    h.issue = null;
    expect((await get()).status).toBe(404);
    const bad = await GET(new NextRequest('https://filmmyrun.com/api/newsletter/view/x'), { params: Promise.resolve({ id: 'x' }) });
    expect(bad.status).toBe(400);
  });
});
