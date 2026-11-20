import { describe, it, expect } from 'vitest';
import { livePayload, runLivePush, type LivePushDeps } from './live-push';
import { registerSchema } from './register-schema';

const now = new Date('2026-12-01T12:00:00Z');
const ago = (min: number) => new Date(now.getTime() - min * 60_000);
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

function deps(over: Partial<LivePushDeps> = {}, startedMinAgo = 5) {
  const sent: string[] = [];
  const recorded: unknown[] = [];
  const dead: string[] = [];
  const d: LivePushDeps = {
    now,
    feed: async () => ({ live: { id: 'v1', title: 'Treadmill ultra', at: iso(ago(startedMinAgo)) }, next: null, recent: [] }),
    lastSentAt: async () => null,
    claim: async () => true,
    devices: async () => [{ token: 'a', environment: 'production' }, { token: 'b', environment: 'sandbox' }],
    send: async (dev) => { sent.push(dev.token); return dev.token === 'b' ? { status: 410, reason: 'Unregistered' } : { status: 200 }; },
    markDead: async (t) => { dead.push(t); },
    record: async (...a) => { recorded.push(a); },
    ...over,
  };
  return { d, sent, recorded, dead };
}

describe('live push', () => {
  it('builds the payload', () => {
    expect(livePayload({ id: 'v1', title: 'T' })).toEqual({
      aps: { alert: { title: "Stephen's live now", body: 'T' }, sound: 'default' }, url: 'filmmyrun://live',
    });
  });
  it('sends once to each device, records, and marks a dead token', async () => {
    const { d, sent, recorded, dead } = deps();
    expect(await runLivePush(d)).toEqual({ outcome: 'sent', id: 'v1', recipients: 2, failures: 1 });
    expect(sent).toEqual(['a', 'b']);
    expect(recorded).toEqual([['v1', 2, 1]]);
    expect(dead).toEqual(['b']);
  });
  it('sends nothing when another instance claimed it', async () => {
    const { d, sent } = deps({ claim: async () => false });
    expect((await runLivePush(d)).outcome).toBe('claimed-elsewhere');
    expect(sent).toEqual([]);
  });
  it('does not push a stream live for 31 minutes', async () => {
    const { d, sent } = deps({}, 31);
    expect((await runLivePush(d)).outcome).toBe('not-due');
    expect(sent).toEqual([]);
  });
  it('does not push when one went out 40 minutes ago (restarted stream)', async () => {
    const { d, sent } = deps({ lastSentAt: async () => ago(40) });
    expect((await runLivePush(d)).outcome).toBe('not-due');
    expect(sent).toEqual([]);
  });
  it('does nothing when not live', async () => {
    const { d } = deps({ feed: async () => ({ live: null, next: null, recent: [] }) });
    expect((await runLivePush(d)).outcome).toBe('not-live');
  });
  it('reports an unavailable feed', async () => {
    const { d } = deps({ feed: async () => null });
    expect((await runLivePush(d)).outcome).toBe('feed-unavailable');
  });
});

describe('register schema live flag', () => {
  const base = { token: 'a'.repeat(64), environment: 'production' as const, news: 'true' };
  it('defaults to false', () => expect(registerSchema.parse(base).live).toBe(false));
  it('accepts "true"', () => expect(registerSchema.parse({ ...base, live: 'true' }).live).toBe(true));
});
