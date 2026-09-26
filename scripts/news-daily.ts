// The daily running-news run: gather, sort, group, write, check, image, publish, then report.
//
// Run:   npm run news:daily               (publishes)
//        npm run news:daily -- --dry-run  (publishes nothing; stories, images and log go to news-dry-run/<date>/)
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { NEWS_CONFIG } from '@/lib/news/config';
import { errorText, NewsRunError, runNews } from '@/lib/news/run';

if (process.argv.includes('--help')) {
  console.log('Usage: npm run news:daily [-- --dry-run]');
  process.exit(0);
}

const dryRun = process.argv.includes('--dry-run');
const outDir = dryRun ? `news-dry-run/${new Date().toISOString().slice(0, 10)}` : undefined;

(async () => {
  const log = await runNews({ now: new Date(), dryRun, outDir });
  await prisma.news_runs.create({ data: { dry_run: dryRun, cost_usd: log.costUsd, summary: log as never } });
  const text = [
    `${dryRun ? `DRY RUN (stories in ${outDir}). ` : ''}${log.published.length} published, ${log.held.length} held, ${log.itemsSeen} items seen, $${log.costUsd.toFixed(3)}.`,
    log.stoppedByCeiling ? `Stopped at the £${NEWS_CONFIG.monthlyCeilingGbp} monthly ceiling.` : '',
    ...log.published.map((p) => `Published: ${p.title} https://filmmyrun.com/news/${p.slug}`),
    ...log.held.map((h) => `Held: ${h.headline} (${h.reason})${h.storyId ? `; publish by hand with npm run news:publish ${h.storyId}` : ''}`),
    ...log.skipped.map((s) => `Not written: ${s.headline} (${s.reason})`),
    ...log.ungrouped.map((u) => `Passed the sort but in no group (retried tomorrow): ${u.title} ${u.url}`),
    ...log.borderline.map((b) => `Borderline (${b.confidence.toFixed(2)}): ${b.url}`),
  ].filter(Boolean).join('\n');
  console.log(text);
  await report(`Film My Run news${dryRun ? ' (dry run)' : ''}: ${log.published.length} published, ${log.held.length} held`, text);
  await prisma.$disconnect();
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
