// A news story on demand, from links Stephen hands over: written, checked and published now.
//
// Run:   npm run news:story -- <url> [<url> ...] [--note "lead with the British angle"] [--headline "..."] [--dry-run]
//        [--text release.txt --text-url <where it is published> --text-source "HOKA UTMB Mont-Blanc"]
//        --text: a press release Stephen pasted that isn't online yet (or can't be read): first line the title.
// Needs: DATABASE_URL, OPENROUTER_API_KEY and the R2_* keys (see .claude/skills/news-story/SKILL.md).
import { readFileSync } from 'node:fs';
import { prisma } from '@/lib/db';
import { errorText, newsRunRow, runNews } from '@/lib/news/run';
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
const textFile = flag('--text');
const urls = args.filter((a, i) => /^https?:\/\//.test(a) && !['--note', '--headline', '--text-url'].includes(args[i - 1]));

(async () => {
  if (!urls.length && !textFile) throw new Error('Give at least one link to the story, or --text.');
  const now = new Date();
  const candidates = await storyCandidates(urls, now);
  if (textFile) {
    const text = readFileSync(textFile, 'utf8').trim();
    candidates.unshift({
      articleId: 0, url: flag('--text-url') ?? urls[0] ?? '', source: flag('--text-source') ?? 'Press release',
      title: text.split('\n')[0].trim(), pubDate: now, summary: '', text, imageUrl: null, photoCredit: null,
    });
  }
  for (const c of candidates) console.log(`${c.text ? 'read' : 'could not read'}: ${c.source} · ${c.title}`);
  const outDir = dryRun ? `news-dry-run/story-${now.toISOString().slice(0, 16).replace(/[:T]/g, '-')}` : undefined;
  const log = await runNews({ now, dryRun, outDir, maxStories: 1, deps: storyDeps(candidates, { note, headline }) });
  await prisma.news_runs.create({ data: newsRunRow(dryRun, { log }, { onDemand: urls }) });
  for (const p of log.published) console.log(dryRun ? `WOULD PUBLISH: ${p.title} (draft in ${outDir})` : `PUBLISHED: https://filmmyrun.com/news/${p.slug}`);
  for (const h of log.notPublished) console.log(`NOT PUBLISHED: ${h.headline}: ${h.reason}`);
  for (const s of log.skipped) console.log(`NOT WRITTEN: ${s.headline}: ${s.reason}`);
  console.log(`Cost: OpenRouter (paid) $${log.costUsd.toFixed(3)}, Claude API credit $${log.claudeCostUsd.toFixed(3)}`);
  await prisma.$disconnect();
  process.exit(log.published.length ? 0 : 2);
})().catch(async (e) => {
  console.error(`FAILED: ${errorText(e)}`);
  await prisma.news_runs.create({ data: newsRunRow(dryRun, { error: e }, { onDemand: urls }) }).catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
