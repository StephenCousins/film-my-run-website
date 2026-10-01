import { londonClock } from '@/lib/push/news-push';

export const DISPATCH_FROM = 5 * 60 + 30;
export const DISPATCH_RETRY_FROM = 6 * 60 + 30;
export const DISPATCH_UNTIL = 11 * 60;
const MAX_ATTEMPTS = 2;
const REPO = 'StephenCousins/film-my-run-website';
const WORKFLOW = `https://api.github.com/repos/${REPO}/actions/workflows/news-daily.yml`;

export interface NewsDispatchDeps {
  now: Date;
  /** Dispatches made this London day, in process memory. */
  attempts: { day: string; count: number };
  ranToday(day: string): Promise<boolean>;
  activeRunToday(utcDate: string): Promise<boolean>;
  dispatch(): Promise<void>;
  alert?(message: string, details: { day: string; error: string }): void;
}
export interface NewsDispatchResult {
  outcome: 'too-early' | 'done' | 'active' | 'dispatched' | 'gave-up' | 'error';
  attempt?: number;
}

/** Runs on every 5-minute tick; never throws. */
export async function runNewsDispatch(deps: NewsDispatchDeps): Promise<NewsDispatchResult> {
  const { day, minutes } = londonClock(deps.now);
  if (deps.attempts.day !== day) { deps.attempts.day = day; deps.attempts.count = 0; }
  if (minutes < DISPATCH_FROM) return { outcome: 'too-early' };
  try {
    if (await deps.ranToday(day)) return { outcome: 'done' };
    if (minutes >= DISPATCH_UNTIL || deps.attempts.count >= MAX_ATTEMPTS) return { outcome: 'gave-up' };
    if (deps.attempts.count === 1 && minutes < DISPATCH_RETRY_FROM) return { outcome: 'too-early' };
    if (await deps.activeRunToday(deps.now.toISOString().slice(0, 10))) return { outcome: 'active' };
    await deps.dispatch();
    deps.attempts.count++;
    return { outcome: 'dispatched', attempt: deps.attempts.count };
  } catch (e) {
    deps.alert?.('[news-dispatch] failed', { day, error: e instanceof Error ? e.message : String(e) });
    return { outcome: 'error' };
  }
}

export async function liveNewsDispatchDeps(now: Date, token: string, attempts: NewsDispatchDeps['attempts'], fetchFn: typeof fetch = fetch): Promise<NewsDispatchDeps> {
  const { dailyRunCompletedOn } = await import('./daily-run');
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  return {
    now,
    attempts,
    ranToday: dailyRunCompletedOn,
    activeRunToday: async (utcDate) => {
      const res = await fetchFn(`${WORKFLOW}/runs?created=%3E%3D${utcDate}&per_page=30`, { headers });
      if (!res.ok) throw new Error(`GitHub runs list ${res.status}`);
      const body = (await res.json()) as { workflow_runs?: { status: string }[] };
      return (body.workflow_runs ?? []).some((r) => ['queued', 'in_progress', 'waiting', 'requested', 'pending'].includes(r.status));
    },
    dispatch: async () => {
      const res = await fetchFn(`${WORKFLOW}/dispatches`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'main', inputs: { dry_run: 'false', if_not_run_today: 'true' } }),
      });
      if (!res.ok) throw new Error(`GitHub dispatch ${res.status}`);
    },
  };
}
