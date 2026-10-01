import { describe, it, expect, vi } from 'vitest';
import { runNewsDispatch, liveNewsDispatchDeps } from './dispatch';

// London time: Dec = GMT, Jul = BST (UTC+1)
const gmt = (hhmm: string) => new Date(`2026-12-01T${hhmm}:00Z`);
function fake(now: Date, over: Record<string, unknown> = {}) {
  return {
    now,
    attempts: { day: '', count: 0 },
    ranToday: vi.fn(async () => false),
    activeRunToday: vi.fn(async () => false),
    dispatch: vi.fn(async () => {}),
    alert: vi.fn(),
    ...over,
  };
}

describe('runNewsDispatch', () => {
  it('too early before 05:30 London (GMT)', async () => {
    const d = fake(gmt('05:29'));
    expect((await runNewsDispatch(d)).outcome).toBe('too-early');
    expect(d.dispatch).not.toHaveBeenCalled();
  });
  it('dispatches at 05:30 GMT', async () => {
    const d = fake(gmt('05:30'));
    expect(await runNewsDispatch(d)).toEqual({ outcome: 'dispatched', attempt: 1 });
  });
  it('BST: 04:30Z is 05:30 London, 04:29Z is not', async () => {
    expect((await runNewsDispatch(fake(new Date('2026-07-01T04:29:00Z')))).outcome).toBe('too-early');
    expect((await runNewsDispatch(fake(new Date('2026-07-01T04:30:00Z')))).outcome).toBe('dispatched');
  });
  it('done when the daily run completed', async () => {
    const d = fake(gmt('06:00'), { ranToday: vi.fn(async () => true) });
    expect((await runNewsDispatch(d)).outcome).toBe('done');
    expect(d.dispatch).not.toHaveBeenCalled();
  });
  it('active run blocks dispatch', async () => {
    const d = fake(gmt('06:00'), { activeRunToday: vi.fn(async () => true) });
    expect((await runNewsDispatch(d)).outcome).toBe('active');
    expect(d.dispatch).not.toHaveBeenCalled();
  });
  it('second dispatch only from 06:30, at most two a day', async () => {
    const d = fake(gmt('05:30'));
    await runNewsDispatch(d);
    d.now = gmt('06:29');
    expect((await runNewsDispatch(d)).outcome).toBe('too-early');
    d.now = gmt('06:30');
    expect(await runNewsDispatch(d)).toEqual({ outcome: 'dispatched', attempt: 2 });
    d.now = gmt('07:00');
    expect((await runNewsDispatch(d)).outcome).toBe('gave-up');
    expect(d.dispatch).toHaveBeenCalledTimes(2);
  });
  it('resets the count on a new London day', async () => {
    const d = fake(gmt('05:30'));
    d.attempts = { day: '2026-11-30', count: 2 };
    expect((await runNewsDispatch(d)).outcome).toBe('dispatched');
  });
  it('gives up from 11:00', async () => {
    const d = fake(gmt('11:00'));
    expect((await runNewsDispatch(d)).outcome).toBe('gave-up');
    expect(d.dispatch).not.toHaveBeenCalled();
  });
  it('GitHub errors alert and never throw, and do not use an attempt', async () => {
    const d = fake(gmt('05:30'), { dispatch: vi.fn(async () => { throw new Error('GitHub dispatch 403'); }) });
    expect((await runNewsDispatch(d)).outcome).toBe('error');
    expect(d.alert).toHaveBeenCalledWith('[news-dispatch] failed', { day: '2026-12-01', error: 'GitHub dispatch 403' });
    expect(d.attempts.count).toBe(0);
  });
});

describe('liveNewsDispatchDeps (faked fetch)', () => {
  it('sends the documented request and detects active runs', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const f = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return { ok: true, status: 204, json: async () => ({ workflow_runs: [{ status: 'completed' }, { status: 'in_progress' }] }) };
    });
    const deps = await liveNewsDispatchDeps(gmt('05:30'), 'tok', { day: '', count: 0 }, f as never);
    expect(await deps.activeRunToday('2026-12-01')).toBe(true);
    expect(calls[0].url).toContain('/workflows/news-daily.yml/runs?created=%3E%3D2026-12-01');
    await deps.dispatch();
    expect(calls[1].url).toBe('https://api.github.com/repos/StephenCousins/film-my-run-website/actions/workflows/news-daily.yml/dispatches');
    expect(calls[1].init.body).toBe('{"ref":"main","inputs":{"dry_run":"false","if_not_run_today":"true"}}');
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });
  it('errors do not leak the token', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 401 }));
    const deps = await liveNewsDispatchDeps(gmt('05:30'), 'secret', { day: '', count: 0 }, f as never);
    await expect(deps.dispatch()).rejects.toThrow('GitHub dispatch 401');
  });
});
