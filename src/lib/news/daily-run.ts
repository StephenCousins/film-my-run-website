import { londonClock } from '@/lib/push/news-push';

/** Did this news_runs summary come from a finished daily run? Failed (error), on-demand and monthly-refresh rows do not count. */
export function isCompletedDailyRun(summary: unknown): boolean {
  if (!summary || typeof summary !== 'object') return false;
  const s = summary as { error?: unknown; onDemand?: unknown; monthlyRefresh?: unknown };
  return !s.error && !s.onDemand && !s.monthlyRefresh;
}

/** The UTC instant London midnight starts the given London day (YYYY-MM-DD), correct across BST/GMT. */
export function londonMidnight(day: string): Date {
  for (const t of [new Date(`${day}T00:00:00Z`), new Date(`${day}T00:00:00Z`).getTime() - 3600_000]) {
    const d = new Date(t);
    const c = londonClock(d);
    if (c.day === day && c.minutes === 0) return d;
  }
  throw new Error(`no London midnight for ${day}`);
}

/** Has today's (London day) live daily run completed? */
export async function dailyRunCompletedOn(day: string): Promise<boolean> {
  const { prisma } = await import('@/lib/db');
  const rows = await prisma.news_runs.findMany({ where: { dry_run: false, started_at: { gte: londonMidnight(day) } }, select: { summary: true } });
  return rows.some((r) => isCompletedDailyRun(r.summary));
}
