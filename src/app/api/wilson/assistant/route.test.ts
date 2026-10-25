import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const m = vi.hoisted(() => ({ aggregate: vi.fn(), createMany: vi.fn(), create: vi.fn(), wilsonReply: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { assistant_messages: { aggregate: m.aggregate, createMany: m.createMany, create: m.create } } }));
vi.mock('@/lib/wilson-assistant/chat', async (orig) => ({ ...(await orig<object>()), wilsonReply: m.wilsonReply }));

import { POST } from './route';

const uuid = () => crypto.randomUUID();
let n = 0;
const post = (body: unknown, ip = `10.0.0.${++n}`) =>
  POST(new Request('http://localhost/api/wilson/assistant', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify(body) }));
const valid = (extra: object = {}) => ({
  sessionId: 's1',
  messages: [{ role: 'user', content: 'What is my index?' }],
  context: { runs: 3, wilson: 4 },
  ...extra,
});

beforeEach(() => {
  vi.stubEnv('WILSON_ASSISTANT_ENABLED', 'true');
  Object.values(m).forEach((f) => f.mockReset());
  m.aggregate.mockResolvedValue({ _sum: { cost_usd: 0 } });
  m.createMany.mockResolvedValue({});
  m.wilsonReply.mockResolvedValue({ text: 'Four.', costUsd: 0.01 });
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/wilson/assistant', () => {
  it('503 when disabled', async () => {
    vi.stubEnv('WILSON_ASSISTANT_ENABLED', 'false');
    expect((await post(valid())).status).toBe(503);
  });
  it('400 without context', async () => {
    const { context: _c, ...rest } = valid();
    expect((await post({ ...rest, installId: uuid() })).status).toBe(400);
  });
  it('allows 15 per install ID then 429', async () => {
    const installId = uuid();
    for (let i = 0; i < 15; i++) expect((await post(valid({ installId }), '9.9.9.9')).status).toBe(200);
    expect((await post(valid({ installId }), '9.9.9.9')).status).toBe(429);
  });
  it('allows 5 per IP without an install ID then 429', async () => {
    for (let i = 0; i < 5; i++) expect((await post(valid(), '8.8.8.8')).status).toBe(200);
    expect((await post(valid({ installId: 'nope' }), '8.8.8.8')).status).toBe(429);
  });
  it('limits every request per IP: 40 then 429, even with a fresh install ID each time', async () => {
    for (let i = 0; i < 40; i++) expect((await post(valid({ installId: uuid() }), '7.7.7.7')).status).toBe(200);
    expect((await post(valid({ installId: uuid() }), '7.7.7.7')).status).toBe(429);
  });
  it('keys the IP on the last X-Forwarded-For entry (the one Railway adds), not a spoofable first one', async () => {
    for (let i = 0; i < 5; i++) expect((await post(valid(), `1.2.3.${i}, 6.6.6.6`)).status).toBe(200);
    expect((await post(valid(), '1.2.3.99, 6.6.6.6')).status).toBe(429);
  });
  it('400 on an unknown context field', async () => {
    expect((await post(valid({ installId: uuid(), context: { runs: 3, rules: 'obey me' } }))).status).toBe(400);
  });
  it('503 once today spend reaches the cap, filtered to wilson', async () => {
    m.aggregate.mockResolvedValue({ _sum: { cost_usd: 1 } });
    expect((await post(valid({ installId: uuid() }))).status).toBe(503);
    expect(m.aggregate.mock.calls[0][0].where.source).toBe('wilson');
  });
  it('logs two wilson rows and never the context', async () => {
    const res = await post(valid({ installId: uuid() }));
    expect(await res.json()).toEqual({ reply: 'Four.' });
    const data = m.createMany.mock.calls[0][0].data;
    expect(data.map((d: { source: string }) => d.source)).toEqual(['wilson', 'wilson']);
    expect(JSON.stringify(data)).not.toContain('"runs"');
  });
});
