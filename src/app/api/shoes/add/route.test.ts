import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: '7' } }) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { POST } from './route';

// An empty query is refused with a 400 straight after the configuration check, so 400 means "got past it".
const post = () => POST(new Request('http://localhost/api/shoes/add', { method: 'POST', body: '{}' }) as unknown as NextRequest);

describe('POST /api/shoes/add: needs an LLM route (19 Nov 2026)', () => {
  beforeEach(() => vi.stubEnv('SERPER_API_KEY', 's'));
  afterEach(() => vi.unstubAllEnvs());

  it('goes ahead with only the Claude API key', async () => {
    vi.stubEnv('ANTHROPIC_CREDIT_API_KEY', 'c');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect((await post()).status).toBe(400);
  });

  it('goes ahead with only OpenRouter', async () => {
    vi.stubEnv('ANTHROPIC_CREDIT_API_KEY', '');
    vi.stubEnv('OPENROUTER_API_KEY', 'k');
    expect((await post()).status).toBe(400);
  });

  it('is refused with neither (an empty key is no key)', async () => {
    vi.stubEnv('ANTHROPIC_CREDIT_API_KEY', ' ');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const res = await post();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Shoe suggestion service is not configured' });
  });
});
