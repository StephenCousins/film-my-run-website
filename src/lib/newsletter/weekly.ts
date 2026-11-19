/**
 * Monday newsletter, run by the server's own 5-minute tick (src/instrumentation.ts) because GitHub's cron started
 * 6 to 10 hours late. From 07:00 London it stages the draft (up to 3 tries); if there is still no draft at 12:00 it
 * emails the admin once.
 */
import { londonClock } from '@/lib/push/news-push';

export const STAGE_FROM = 7 * 60;
export const ALERT_AT = 12 * 60;
const MAX_TRIES = 3;

export type WeeklyState = { day: string; tries: number; alerted: boolean };
export interface WeeklyDeps {
  now: Date;
  state: WeeklyState;
  issueToday(): Promise<boolean>;
  stage(): Promise<void>;
  alert(): Promise<void>;
}
export type WeeklyOutcome = 'not-monday' | 'too-early' | 'done' | 'staged' | 'error' | 'waiting' | 'alerted' | 'gave-up';

export async function runWeeklyNewsletter(d: WeeklyDeps): Promise<{ outcome: WeeklyOutcome; error?: string }> {
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long' }).format(d.now);
  if (weekday !== 'Monday') return { outcome: 'not-monday' };
  const { day, minutes } = londonClock(d.now);
  if (d.state.day !== day) Object.assign(d.state, { day, tries: 0, alerted: false });
  if (minutes < STAGE_FROM) return { outcome: 'too-early' };
  try {
    if (await d.issueToday()) return { outcome: 'done' };
    if (minutes >= ALERT_AT) {
      if (d.state.alerted) return { outcome: 'gave-up' };
      d.state.alerted = true;
      await d.alert();
      return { outcome: 'alerted' };
    }
    if (d.state.tries >= MAX_TRIES) return { outcome: 'waiting' };
    d.state.tries++;
    await d.stage();
    return { outcome: 'staged' };
  } catch (e) {
    return { outcome: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}
