import { NextRequest } from 'next/server';
import { runWeekly } from '@/lib/shoes/job/weekly';
import { sendDigest } from '@/lib/shoes/job/digest';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * The weekly Shoe Finder job, called by the scheduled workflow. Returns the
 * JobReport as JSON: 200 when nothing errored, 500 otherwise, so the workflow
 * fails visibly. `?dryRun=1` runs every read and no write.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.OPENROUTER_API_KEY) return Response.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 503 });
  if (!process.env.BRAVE_SEARCH_API_KEY && !process.env.SERPER_API_KEY) {
    return Response.json({ error: 'No search API key configured (BRAVE_SEARCH_API_KEY or SERPER_API_KEY)' }, { status: 503 });
  }

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const report = await runWeekly({ dryRun });
  console.log(
    `Shoe Finder weekly${dryRun ? ' (dry run)' : ''}: ${report.discovered} discovered, ${report.published.length} published, ` +
    `${report.held.length} held, ${report.errored.length} errored, ${report.reviewsRefreshed} reviews refreshed, ` +
    `${report.imagesStored.length} images stored, ${report.imagesCleared.length} cleared, ${Math.round(report.durationMs / 1000)}s`
  );
  if (!dryRun) {
    try { await sendDigest(report); } catch (err) { console.error('Shoe digest failed', err); }
  }
  return Response.json(report, { status: report.errored.length === 0 ? 200 : 500 });
}
