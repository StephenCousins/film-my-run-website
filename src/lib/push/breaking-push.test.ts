import { describe, it, expect } from 'vitest';
import { awake, runBreakingPush, type BreakingPushDeps } from './breaking-push';

const at = (hhmm: string) => new Date(`2026-12-01T${hhmm}:00Z`); // GMT: UTC = London

function deps(now: Date, queued: { slug: string; title: string } | null, over: Partial<BreakingPushDeps> = {}) {
  const sent: string[] = [];
  const recorded: unknown[] = [];
  const d: BreakingPushDeps = {
    now,
    next: async () => queued,
    claim: async () => true,
    devices: async () => [{ token: 'a', environment: 'production' }, { token: 'b', environment: 'sandbox' }],
    send: async (dev) => { sent.push(dev.token); return dev.token === 'b' ? { status: 410, reason: 'Unregistered' } : { status: 200 }; },
    markDead: async () => {},
    record: async (...a) => { recorded.push(a); },
    ...over,
  };
  return { d, sent, recorded };
}

describe('breaking push', () => {
  it('is quiet from 22:00 to 07:00 London', () => {
    expect(awake(at('06:59'))).toBe(false);
    expect(awake(at('07:00'))).toBe(true);
    expect(awake(at('21:59'))).toBe(true);
    expect(awake(at('22:00'))).toBe(false);
  });
  it('sends a queued story to every device and records the failures', async () => {
    const { d, sent, recorded } = deps(at('12:00'), { slug: 's', title: 'T' });
    expect(await runBreakingPush(d)).toEqual({ outcome: 'sent', slug: 's', recipients: 2, failures: 1 });
    expect(sent).toEqual(['a', 'b']);
    expect(recorded).toEqual([['s', 2, 1]]);
  });
  it('waits at night', async () => {
    const { d, sent } = deps(at('23:00'), { slug: 's', title: 'T' });
    expect((await runBreakingPush(d)).outcome).toBe('quiet-hours');
    expect(sent).toEqual([]);
  });
  it('sends nothing when another instance claimed it', async () => {
    const { d, sent } = deps(at('12:00'), { slug: 's', title: 'T' }, { claim: async () => false });
    expect((await runBreakingPush(d)).outcome).toBe('claimed-elsewhere');
    expect(sent).toEqual([]);
  });
  it('only looks a day back', async () => {
    let since: Date | undefined;
    const { d } = deps(at('12:00'), null, { next: async (s) => { since = s; return null; } });
    expect((await runBreakingPush(d)).outcome).toBe('nothing-queued');
    expect(since?.toISOString()).toBe('2026-11-30T12:00:00.000Z');
  });
});
