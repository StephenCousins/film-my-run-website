// A news story on demand, from links Stephen hands over: written, checked and published now.
//
// Run:   npm run news:story -- <url> [<url> ...] [--note "lead with the British angle"] [--headline "..."] [--dry-run]
// Needs: DATABASE_URL, OPENROUTER_API_KEY and the R2_* keys (see .claude/skills/news-story/SKILL.md).
import { prisma } from '@/lib/db';
import { errorText, NewsRunError, runNews } from '@/lib/news/run';
import { storyCandidates, storyDeps } from '@/lib/news/story';

const args = process.argv.slice(2);
if (args.includes('--help') || args.length === 0) {
  console.log('Usage: npm run news:story -- <url> [<url> ...] [--note "..."] [--headline "..."] [--dry-run]');
  process.exit(args.length ? 0 : 1);
}
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');
const note = flag('--note');
const headline = flag('--headline');
const urls = args.filter((a, i) => /^https?:\/\//.test(a) && !['--note', '--headline'].includes(args[i - 1]));

(async () => {
  if (!urls.length) throw new Error('Give at least one link to the story.');
  const now = new Date();
  const candidates = await storyCandidates(urls, now);
  for (const c of candidates) console.log(`${c.text ? 'read' : 'could not read'}: ${c.source} · ${c.title}`);
  const outDir = dryRun ? `news-dry-run/story-${now.toISOString().slice(0, 16).replace(/[:T]/g, '-')}` : undefined;
  const log = await runNews({ now, dryRun, outDir, maxStories: 1, deps: storyDeps(candidates, { note, headline }) });
  await prisma.news_runs.create({ data: { dry_run: dryRun, cost_usd: log.costUsd, summary: { ...log, onDemand: urls } as never } });
  for (const p of log.published) console.log(dryRun ? `WOULD PUBLISH: ${p.title} (draft in ${outDir})` : `PUBLISHED: https://filmmyrun.com/news/${p.slug}`);
  for (const h of log.held) console.log(`HELD: ${h.headline}: ${h.reason}${h.storyId ? ` (publish anyway: npm run news:publish ${h.storyId})` : ''}`);
  for (const s of log.skipped) console.log(`NOT WRITTEN: ${s.headline}: ${s.reason}`);
  console.log(`Cost: $${log.costUsd.toFixed(3)}`);
  await prisma.$disconnect();
  process.exit(log.published.length ? 0 : 2);
})().catch(async (e) => {
  console.error(`FAILED: ${errorText(e)}`);
  const spent = e instanceof NewsRunError ? e.log.costUsd : 0;
  await prisma.news_runs.create({ data: { dry_run: dryRun, cost_usd: spent, summary: { error: errorText(e), onDemand: urls } } }).catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
