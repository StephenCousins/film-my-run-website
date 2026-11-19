import { describe, it, expect } from 'vitest';
import { runWeeklyNewsletter, type WeeklyDeps } from './weekly';

// 16 Nov 2026 is a Monday; GMT, so UTC = London.
const at = (iso: string) => new Date(iso);

function deps(over: Partial<WeeklyDeps> = {}) {
  const calls = { stage: 0, alert: 0 };
  let made = false;
  const d: WeeklyDeps = {
    now: at('2026-11-16T07:05:00Z'),
    state: { day: '', tries: 0, alerted: false },
    issueToday: async () => made,
    stage: async () => {
      calls.stage++;
      made = true;
    },
    alert: async () => void calls.alert++,
    ...over,
  };
  return { d, calls };
}

describe('runWeeklyNewsletter', () => {
  it('stages once on Monday from 07:00, then is done', async () => {
    const { d, calls } = deps();
    expect((await runWeeklyNewsletter(d)).outcome).toBe('staged');
    expect((await runWeeklyNewsletter(d)).outcome).toBe('done');
    expect(calls.stage).toBe(1);
  });

  it('does nothing before 07:00 or on other days', async () => {
    expect((await runWeeklyNewsletter(deps({ now: at('2026-11-16T06:55:00Z') }).d)).outcome).toBe('too-early');
    expect((await runWeeklyNewsletter(deps({ now: at('2026-11-17T09:00:00Z') }).d)).outcome).toBe('not-monday');
  });

  it('BST: 07:00 London is 06:00 UTC', async () => {
    expect((await runWeeklyNewsletter(deps({ now: at('2026-06-15T06:05:00Z') }).d)).outcome).toBe('staged');
  });

  it('retries 3 times, then emails the admin once at noon', async () => {
    const { d, calls } = deps({ stage: async () => { throw new Error('db down'); } });
    for (let i = 0; i < 5; i++) await runWeeklyNewsletter(d);
    expect(d.state.tries).toBe(3);
    d.now = at('2026-11-16T12:00:00Z');
    expect((await runWeeklyNewsletter(d)).outcome).toBe('alerted');
    expect((await runWeeklyNewsletter(d)).outcome).toBe('gave-up');
    expect(calls.alert).toBe(1);
  });

  it('no alert at noon if the draft exists', async () => {
    const { d, calls } = deps({ now: at('2026-11-16T12:30:00Z'), issueToday: async () => true });
    expect((await runWeeklyNewsletter(d)).outcome).toBe('done');
    expect(calls.alert).toBe(0);
  });
});
