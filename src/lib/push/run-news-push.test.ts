import { describe, it, expect, vi } from 'vitest';
import { runNewsPush, cutoffUnix } from './news-push';

const story = (slug: string) => ({ slug, title: `T ${slug}`, excerpt: '', imageUrl: null, publishedAt: '2026-12-01T03:17:00Z', url: '', topStory: true });
const at = (hhmm: string) => new Date(`2026-12-01T${hhmm}:00Z`);

function fake(over: Record<string, unknown> = {}) {
  const sent = new Set<string>();
  const deps = {
    now: at('07:31'),
    clock: () => at('07:31'),
    feed: async () => [story('a')],
    lastSentSlug: async () => null as string | null,
    alreadySent: vi.fn(async (d: string) => sent.has(d)),
    newsRanToday: vi.fn(async () => true),
    claim: vi.fn(async (d: string) => { sent.add(d); return true; }),
    devices: async () => [
      { token: 't1', environment: 'sandbox' as const },
      { token: 't2', environment: 'production' as const },
    ],
    send: vi.fn(async () => ({ status: 200 })),
    markDead: vi.fn(async () => {}),
    record: vi.fn(async () => {}),
    alert: vi.fn(),
    finish: vi.fn(),
    ...over,
  };
  return deps;
}

describe('runNewsPush', () => {
  it('does nothing outside the window', async () => {
    const d = fake({ now: at('06:00') });
    expect((await runNewsPush(d)).outcome).toBe('outside-window');
    expect(d.send).not.toHaveBeenCalled();
  });
  it('waits for today\'s news run before claiming', async () => {
    const d = fake({ newsRanToday: vi.fn(async () => false) });
    expect((await runNewsPush(d)).outcome).toBe('waiting-for-news');
    expect(d.claim).not.toHaveBeenCalled();
    expect(d.newsRanToday).toHaveBeenCalledWith('2026-12-01');
  });
  it('sends to every device and records counts; each with its own environment', async () => {
    const d = fake();
    expect(await runNewsPush(d)).toEqual({ outcome: 'sent', slug: 'a', recipients: 2, failures: 0 });
    expect(d.send.mock.calls.map((c: any[]) => c[0].environment)).toEqual(['sandbox', 'production']);
    expect(d.record).toHaveBeenCalledWith('2026-12-01', 2, 0);
    expect(d.claim).toHaveBeenCalledWith('2026-12-01', 'a', 2);
    expect(d.finish).toHaveBeenCalled();
    expect(d.alert).not.toHaveBeenCalled();
  });
  it('is already-sent on a second call the same day', async () => {
    const d = fake();
    await runNewsPush(d);
    d.send.mockClear();
    expect((await runNewsPush(d)).outcome).toBe('already-sent');
    expect(d.send).not.toHaveBeenCalled();
  });
  it('skips when another instance claimed', async () => {
    const d = fake({ claim: vi.fn(async () => false) });
    expect((await runNewsPush(d)).outcome).toBe('claimed-elsewhere');
    expect(d.send).not.toHaveBeenCalled();
  });
  it('no-new-story does not claim', async () => {
    const d = fake({ lastSentSlug: async () => 'a' });
    expect((await runNewsPush(d)).outcome).toBe('no-new-story');
    expect(d.claim).not.toHaveBeenCalled();
  });
  it('marks dead tokens and counts them as failures', async () => {
    const d = fake({ send: vi.fn(async (dev: { token: string }) => (dev.token === 't1' ? { status: 410, reason: 'Unregistered' } : { status: 200 })) });
    const r = await runNewsPush(d);
    expect(d.markDead).toHaveBeenCalledWith('t1');
    expect(r).toMatchObject({ recipients: 2, failures: 1 });
  });
  it('a throwing send is a failure and does not stop the rest', async () => {
    const d = fake({ send: vi.fn(async (dev: { token: string }) => { if (dev.token === 't1') throw new Error('net'); return { status: 200 }; }) });
    const r = await runNewsPush(d);
    expect(r).toMatchObject({ outcome: 'sent', recipients: 2, failures: 1 });
    expect(d.send).toHaveBeenCalledTimes(2);
    expect(d.record).toHaveBeenCalledWith('2026-12-01', 2, 1);
  });
  it('dry run never claims or sends', async () => {
    const d = fake({ dryRun: true });
    expect(await runNewsPush(d)).toEqual({ outcome: 'dry-run', slug: 'a', recipients: 2 });
    expect(d.claim).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
  });
  it('stops sending once the clock passes 11:00 and counts the rest as failures', async () => {
    const times = [at('10:59'), at('11:00')];
    let i = 0;
    const d = fake({ clock: () => times[Math.min(i++, 1)] });
    const r = await runNewsPush(d);
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ recipients: 2, failures: 1 });
    expect(d.finish).toHaveBeenCalled();
  });
  it('passes the 11:00 London expiry to send', async () => {
    const d = fake();
    await runNewsPush(d);
    expect((d.send.mock.calls[0] as unknown[])[2]).toEqual({ expiration: Date.parse('2026-12-01T11:00:00Z') / 1000 });
  });
  it('cutoffUnix is 11:00 London in both BST and GMT', () => {
    expect(cutoffUnix('2026-07-01')).toBe(Date.parse('2026-07-01T10:00:00Z') / 1000);
    expect(cutoffUnix('2026-12-01')).toBe(Date.parse('2026-12-01T11:00:00Z') / 1000);
  });
  it('alerts when most sends fail, without tokens', async () => {
    const d = fake({ send: vi.fn(async () => ({ status: 403, reason: 'ExpiredProviderToken' })) });
    await runNewsPush(d);
    expect(d.alert).toHaveBeenCalledWith('[news-push] most sends failed', { day: '2026-12-01', recipients: 2, failures: 2, firstReason: 'ExpiredProviderToken' });
  });
  it('does not alert at exactly half failing', async () => {
    const d = fake({ send: vi.fn(async (dev: { token: string }) => ({ status: dev.token === 't1' ? 500 : 200 })) });
    await runNewsPush(d);
    expect(d.alert).not.toHaveBeenCalled();
  });
});
