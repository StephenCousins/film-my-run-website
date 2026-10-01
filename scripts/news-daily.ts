// The daily running-news run: gather, sort, group, write, check, image, publish, then report.
//
// Run:   npm run news:daily               (publishes)
//        npm run news:daily -- --dry-run  (publishes nothing; stories, images and log go to news-dry-run/<date>/)
//        npm run news:daily -- --weekly-report     (sends the Monday email now; prints it only if NEWS_REPORT_TO is unset)
//        npm run news:daily -- --if-not-run-today  (the 08:17 catch-up: does nothing if today's run happened)
//        npm run news:daily -- --monthly-refresh   (the monthly runner refresh on its own, live; normally the first Monday)
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { isCompletedDailyRun } from '@/lib/news/daily-run';
import { NEWS_CONFIG } from '@/lib/news/config';
import { errorText, NewsRunError, runNews } from '@/lib/news/run';
import { liveMonthlyDeps, monthlyRefresh, type MonthlySummary } from '@/lib/runners/monthly';
import { refreshUtmbIndexes } from '@/lib/runners/refresh';

if (process.argv.includes('--help')) {
  console.log('Usage: npm run news:daily [-- --dry-run] [--max N]   (--max: a one-off larger run, e.g. the launch fill)');
  process.exit(0);
}

const dryRun = process.argv.includes('--dry-run');
const maxArg = process.argv.indexOf('--max');
const maxStories = maxArg > 0 ? Math.min(20, Math.max(1, parseInt(process.argv[maxArg + 1], 10) || 0)) : undefined;
const outDir = dryRun ? `news-dry-run/${new Date().toISOString().slice(0, 10)}` : undefined;

(async () => {
  // Send (or, with NEWS_REPORT_TO unset, just print) the weekly email without running the news.
  if (process.argv.includes('--weekly-report')) {
    await weeklyReport();
    await prisma.$disconnect();
    process.exit(0);
  }
  if (process.argv.includes('--monthly-refresh')) {
    await runMonthlyRefresh();
    await prisma.$disconnect();
    process.exit(0);
  }
  // The catch-up schedule: GitHub sometimes skips a scheduled run (27 Sep 2026), so a second
  // one later in the morning runs the news only if no live daily run has COMPLETED today (a failed run retries).
  if (process.argv.includes('--if-not-run-today')) {
    const since = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    const today = await prisma.news_runs.findMany({ where: { dry_run: false, started_at: { gte: since } }, select: { summary: true } });
    if (today.some((r) => isCompletedDailyRun(r.summary))) {
      console.log("Today's run already happened; nothing to do.");
      await prisma.$disconnect();
      process.exit(0);
    }
    console.log('No run yet today (the scheduled one was skipped): running now.');
  }
  const log = await runNews({ now: new Date(), dryRun, outDir, maxStories });
  await prisma.news_runs.create({ data: { dry_run: dryRun, cost_usd: log.costUsd, summary: log as never } });
  const text = [
    `${dryRun ? `DRY RUN (stories in ${outDir}). ` : ''}${log.published.length} published, ${log.notPublished.length} not published, ${log.itemsSeen} items seen, $${log.costUsd.toFixed(3)}.`,
    log.stoppedByCeiling ? `Stopped at the £${NEWS_CONFIG.monthlyCeilingGbp} monthly ceiling.` : '',
    ...runLines(log as unknown as RunSummary, dryRun),
  ].filter(Boolean).join('\n');
  console.log(text);
  // Stephen asked for the report weekly (27 Sep 2026): Mondays carry the last seven days.
  // A dry run is asked for by hand, so it still reports at once; failures always report at once.
  if (dryRun) await report(`Film My Run news (dry run): ${log.published.length} would publish, ${log.notPublished.length} not published`, text);
  else if (new Date().getUTCDay() === 1) {
    const utmb = await refreshUtmbIndexes().then(
      (r) => [
        r.note ?? `UTMB Index refreshed for ${r.updated} runners`,
        r.missing.length ? `not found on UTMB: ${r.missing.join(', ')}` : '',
        r.cutShort ? `refresh cut short, ${r.cutShort} not checked` : '',
      ].filter(Boolean).join('; ') + '.',
      (e) => `UTMB Index refresh FAILED: ${errorText(e)}`,
    );
    console.log(utmb);
    await weeklyReport(utmb);
    // Once a month (Stephen, 28 Sep 2026): the first Monday adds new results and refreshes bios.
    // After the weekly email, so a job timeout can never cost that; its own short email.
    if (new Date().getUTCDate() <= 7) await runMonthlyRefresh();
  }
  await prisma.$disconnect();
  // Something (an HTTP keep-alive pool) holds the event loop open after the work is done;
  // the first run sat idle until the workflow's 30-minute timeout. Done is done.
  process.exit(0);
})().catch(async (e) => {
  console.error(e);
  // Best effort from here on: record what the failed run spent, and say it failed. Neither may hide the original error.
  const message = errorText(e);
  const spent = e instanceof NewsRunError ? e.log.costUsd : 0;
  await prisma.news_runs.create({ data: { dry_run: dryRun, cost_usd: spent, summary: { error: message } } }).catch((err) => console.error('Could not record the failed run:', err));
  await report(`Film My Run news${dryRun ? ' (dry run)' : ''}: run failed`, `News run failed: ${message}\nSpent before failing: $${spent.toFixed(3)}.`).catch((err) => console.error('Could not send the failure email:', err));
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

/**
 * The monthly runner refresh. Its spend goes into a news_runs row after every bio (so the
 * monthly ceiling sees it even if the job is killed), then a short email says what it did.
 */
async function runMonthlyRefresh(): Promise<void> {
  let rowId: number | null = null;
  const record = async (r: MonthlySummary) => {
    const data = { cost_usd: r.costUsd, summary: { monthlyRefresh: r } as never };
    if (rowId === null) rowId = (await prisma.news_runs.create({ data: { dry_run: false, ...data } })).id;
    else await prisma.news_runs.update({ where: { id: rowId }, data });
  };
  let text: string;
  try {
    const r = await monthlyRefresh({ ...liveMonthlyDeps(), progress: record });
    await record(r);
    text = [
      `Monthly runner refresh: ${r.resultsAdded} results added, ${r.biosRefreshed.length} bios refreshed${r.biosRefreshed.length ? ` (${r.biosRefreshed.join(', ')})` : ''}, ${r.skipped.length} skipped. $${r.costUsd.toFixed(2)}.`,
      r.utmbNotRead ? `${r.utmbNotRead} UTMB pages could not be read.` : '',
      ...r.skipped.map((x) => `  ${x.slug}: ${x.reason}`),
      r.cutShort ? 'Cut short by the budget or the time limit.' : '',
    ].filter(Boolean).join('\n');
  } catch (e) {
    text = `Monthly runner refresh FAILED: ${errorText(e)}`;
  }
  console.log(text);
  await report(text.split('\n')[0], text).catch((err) => console.error('Could not send the monthly refresh email:', err));
}

type RunSummary = {
  published?: { title: string; slug: string }[];
  notPublished?: { headline: string; reason: string }[];
  held?: { headline: string; reason: string }[]; // the name before 27 Sep 2026
  skipped?: { headline: string; reason: string }[];
  ungrouped?: { title: string; url: string }[];
  borderline?: { url: string; confidence: number }[];
  onDemand?: string[];
  error?: string;
};

function runLines(log: RunSummary, dryRun = false, brief = false): string[] {
  const passedOver = (log.skipped?.length ?? 0) + (log.ungrouped?.length ?? 0);
  if (brief) return [
    ...(log.published ?? []).map((p) => `Published: ${p.title} https://filmmyrun.com/news/${p.slug}`),
    ...(log.notPublished ?? log.held ?? []).map((h) => `Not published: ${h.headline} (${h.reason})`),
    ...((log as { profiles?: { name: string; slug?: string; reason?: string }[] }).profiles ?? []).map((p) => p.slug ? `Runner page: ${p.name} https://filmmyrun.com/runners/${p.slug}` : `No runner page for ${p.name} (${p.reason})`),
    passedOver ? `${passedOver} more passed the sort but weren't written (cap, too old, or no group).` : '',
  ].filter(Boolean);
  return [
    ...(log.published ?? []).map((p) => dryRun ? `Would publish: ${p.title}` : `Published: ${p.title} https://filmmyrun.com/news/${p.slug}`),
    ...(log.notPublished ?? log.held ?? []).map((h) => `Not published: ${h.headline} (${h.reason})`),
    ...((log as { profiles?: { name: string; slug?: string; reason?: string }[] }).profiles ?? []).map((p) => p.slug ? `Runner page: ${p.name} https://filmmyrun.com/runners/${p.slug}` : `No runner page for ${p.name} (${p.reason})`),
    ...(log.skipped ?? []).map((s) => `Not written: ${s.headline} (${s.reason})`),
    ...(log.ungrouped ?? []).map((u) => `Passed the sort but in no group (retried tomorrow): ${u.title} ${u.url}`),
    ...(log.borderline ?? []).map((b) => `Borderline (${b.confidence.toFixed(2)}): ${b.url}`),
  ];
}

// ponytail: if both Monday runs are skipped, that week's email is skipped too; the next Monday covers only its own 7 days.
async function weeklyReport(extra = '') {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const runs = await prisma.news_runs.findMany({ where: { dry_run: false, started_at: { gte: since } }, orderBy: { started_at: 'asc' } });
  const logs = runs.map((r) => ({ at: r.started_at, cost: Number(r.cost_usd ?? 0), log: (r.summary ?? {}) as RunSummary }));
  const published = logs.reduce((n, r) => n + (r.log.published?.length ?? 0), 0);
  const notPublished = logs.reduce((n, r) => n + (r.log.notPublished ?? r.log.held ?? []).length, 0);
  const cost = logs.reduce((n, r) => n + r.cost, 0);
  const text = [
    `The week to ${new Date().toISOString().slice(0, 10)}: ${runs.length} runs, ${published} published, ${notPublished} not published, $${cost.toFixed(2)}.`,
    ...(extra ? [extra] : []),
    ...logs.flatMap((r) => [
      '',
      `${r.at.toISOString().slice(0, 10)}${r.log.onDemand ? ' (story on demand)' : ''}${r.log.error ? `: FAILED: ${r.log.error}` : ''}`,
      ...runLines(r.log, false, true),
    ]),
  ].join('\n');
  console.log(text);
  await report(`Film My Run news, week: ${published} published, ${notPublished} not published`, text);
}

async function report(subject: string, text: string) {
  if (!process.env.RESEND_API_KEY || !process.env.NEWS_REPORT_TO) return;
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Film My Run <news@filmmyrun.com>',
    to: process.env.NEWS_REPORT_TO,
    subject,
    text,
  });
  if (error) throw new Error(`Report email failed: ${errorText(error.message)}`);
}
