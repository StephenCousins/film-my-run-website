import { mkdir, writeFile } from 'node:fs/promises';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { NEWS_CONFIG } from './config';
import { gatherCandidates } from './gather';
import { bundleImportance, groupItems } from './group';
import { storyImage } from './image';
import { pickBundles, STORY_ESTIMATE_USD, uniqueSlug, withinCeiling } from './plan';
import { ruleProblems } from './rules';
import { isBorderline, passesSort, sortItem } from './sort';
import type { Bundle, Candidate, Draft, RunLog, StoryToPublish, Verdict } from './types';
import { checkFacts, writeStory } from './write';

type Seen = { c: Candidate; v: Verdict | null; bundleKey?: string };

export interface RunDeps {
  gather: (now: Date) => Promise<Candidate[]>;
  sort: (c: Candidate) => ReturnType<typeof sortItem>;
  group: (items: { c: Candidate; v: Verdict }[], recent: string[]) => ReturnType<typeof groupItems>;
  write: (b: Bundle, now: Date) => ReturnType<typeof writeStory>;
  check: (d: Draft, b: Bundle) => ReturnType<typeof checkFacts>;
  image: typeof storyImage;
  publish: (s: StoryToPublish) => Promise<void>;
  /** Saves the story unpublished with its reason; returns its id for `npm run news:publish <id>`. */
  hold: (s: StoryToPublish, reason: string) => Promise<number>;
  monthSpentUsd: (now: Date) => Promise<number>;
  recentHeadlines: (now: Date) => Promise<string[]>;
  takenSlugs: () => Promise<Set<string>>;
  markSeen: (items: Seen[]) => Promise<void>;
}

const esc = (p: string) => p.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

async function saveStory(s: StoryToPublish, status: 'published' | 'held', heldReason: string | null): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const story = await tx.news_stories.create({ data: {
      slug: s.slug, title: s.title, excerpt: s.excerpt,
      content: s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n'),
      image_url: s.imageUrl, photo_credit: s.photoCredit,
      source_url: s.sources[0]?.url ?? '', sources: s.sources as unknown as Prisma.InputJsonValue,
      topic: s.topic, is_uk: s.isUk, importance: s.importance, priority: 100 - s.importance * 10,
      status, held_reason: heldReason, published_at: status === 'published' ? new Date() : null,
    } });
    await tx.news_items.updateMany({ where: { article_id: { in: s.articleIds } }, data: { story_id: story.id } });
    return story.id;
  });
}

const liveDeps: RunDeps = {
  gather: gatherCandidates,
  sort: (c) => sortItem(c),
  group: (items, recent) => groupItems(items, recent),
  write: (b, now) => writeStory(b, now),
  check: (d, b) => checkFacts(d, b),
  image: storyImage,
  publish: async (s) => { await saveStory(s, 'published', null); },
  hold: (s, reason) => saveStory(s, 'held', reason),
  monthSpentUsd: async (now) => {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const r = await prisma.news_runs.aggregate({ _sum: { cost_usd: true }, where: { started_at: { gte: from } } });
    return r._sum.cost_usd ?? 0;
  },
  recentHeadlines: async (now) => (await prisma.news_stories.findMany({ where: { published_at: { gte: new Date(now.getTime() - NEWS_CONFIG.windowDays * 86_400_000) } }, select: { title: true } })).map((s) => s.title),
  takenSlugs: async () => new Set((await prisma.news_stories.findMany({ select: { slug: true } })).map((s) => s.slug)),
  markSeen: async (items) => {
    for (const { c, v, bundleKey } of items) {
      const verdict = (v ?? undefined) as Prisma.InputJsonValue | undefined;
      await prisma.news_items.upsert({ where: { article_id: c.articleId }, update: { verdict, bundle_key: bundleKey }, create: { article_id: c.articleId, url: c.url, source: c.source, verdict, bundle_key: bundleKey } });
    }
  },
};

/** A dry run keeps its images next to its stories instead of uploading them. */
const saveLocally = (dir: string) => async (key: string, body: Buffer) => {
  const file = `${dir}/${key.split('/').pop()}`;
  await writeFile(file, body);
  return file;
};

export async function runNews({ now, dryRun, outDir, deps = {} }: { now: Date; dryRun: boolean; outDir?: string; deps?: Partial<RunDeps> }): Promise<RunLog> {
  const d: RunDeps = { ...liveDeps, ...deps };
  const log: RunLog = { dryRun, itemsSeen: 0, sortedOut: [], borderline: [], ungrouped: [], skipped: [], held: [], published: [], costUsd: 0, stoppedByCeiling: false };
  const markSeen = (items: Seen[]) => (dryRun || items.length === 0 ? Promise.resolve() : d.markSeen(items));
  const save = async (name: string, data: unknown) => { if (outDir) await writeFile(`${outDir}/${name}`, JSON.stringify(data, null, 2)); };
  if (outDir) await mkdir(outDir, { recursive: true });

  const candidates = await d.gather(now);
  log.itemsSeen = candidates.length;
  const sorted: Seen[] = [];
  for (const c of candidates) {
    const { verdict, costUsd } = await d.sort(c);
    log.costUsd += costUsd;
    sorted.push({ c, v: verdict });
    if (isBorderline(verdict)) log.borderline.push({ url: c.url, confidence: verdict!.confidence });
    else if (!passesSort(verdict)) log.sortedOut.push({ url: c.url, type: verdict?.type ?? 'other', confidence: verdict?.confidence ?? 0 });
  }
  const passed = sorted.filter((s): s is { c: Candidate; v: Verdict } => passesSort(s.v));
  const grouped = await d.group(passed, await d.recentHeadlines(now));
  log.costUsd += grouped.costUsd;

  // Anything not decided this run stays unseen, so tomorrow's run looks at it again:
  // items the grouper left out, and bundles over the cap or past the ceiling.
  const inBundle = new Set(grouped.bundles.flatMap((b) => b.items.map((i) => i.articleId)));
  for (const { c } of passed) if (!inBundle.has(c.articleId)) log.ungrouped.push({ url: c.url, title: c.title });
  const bundleSeen = (b: Bundle): Seen[] => b.items.map((c, i) => ({ c, v: b.verdicts[i] ?? null, bundleKey: b.key }));
  const covered = grouped.bundles.filter((b) => b.alreadyCovered);
  for (const b of covered) log.skipped.push({ headline: b.headline, reason: 'already covered' });
  await markSeen([...sorted.filter((s) => !passesSort(s.v)), ...covered.flatMap(bundleSeen)]);

  const picked = pickBundles(grouped.bundles, NEWS_CONFIG.maxStoriesPerRun);
  for (const b of grouped.bundles) {
    if (!b.alreadyCovered && !picked.includes(b)) log.skipped.push({ headline: b.headline, reason: `over the ${NEWS_CONFIG.maxStoriesPerRun}-story cap` });
  }

  const taken = await d.takenSlugs();
  const monthBefore = await d.monthSpentUsd(now);
  for (const b of picked) {
    if (log.stoppedByCeiling || !withinCeiling(monthBefore + log.costUsd, STORY_ESTIMATE_USD)) {
      log.stoppedByCeiling = true;
      log.skipped.push({ headline: b.headline, reason: 'monthly ceiling' });
      continue;
    }
    let story: StoryToPublish | null = null;
    try {
      await markSeen(bundleSeen(b));
      const w = await d.write(b, now);
      log.costUsd += w.costUsd;
      if (!w.draft) { log.held.push({ headline: b.headline, reason: w.refusal ?? 'no draft' }); continue; }
      const slug = uniqueSlug(w.draft.title, taken);
      taken.add(slug);
      const lead = b.verdicts.reduce((a, v) => (v.importance > a.importance ? v : a), b.verdicts[0]);
      story = {
        ...w.draft, slug, topic: lead.topic, isUk: b.verdicts.some((v) => v.isUk), importance: bundleImportance(b),
        sources: b.items.map((i) => ({ site: i.source, url: i.url })), imageUrl: null, photoCredit: null,
        bundleKey: b.key, articleIds: b.items.map((i) => i.articleId),
      };
      // The full text, not the writer's 12,000-character slice: a copied sentence can sit anywhere.
      const problems = ruleProblems(w.draft, b.items.map((i) => i.text ?? ''));
      let reason = problems.length ? problems.join(', ') : null;
      if (!reason) {
        const c = await d.check(w.draft, b);
        log.costUsd += c.costUsd;
        if (!c.ok) reason = `unsupported: ${c.unsupported.join('; ')}`;
      }
      if (reason) {
        const storyId = dryRun ? undefined : await d.hold(story, reason);
        log.held.push({ headline: b.headline, reason, ...(storyId ? { storyId } : {}) });
        await save(`${slug}.held.json`, { reason, story });
        continue;
      }
      const img = !dryRun ? await d.image(b, slug) : outDir ? await d.image(b, slug, { upload: saveLocally(outDir) }) : null;
      story.imageUrl = img?.url || null;
      story.photoCredit = img?.credit ?? null;
      if (!dryRun) await d.publish(story);
      await save(`${slug}.json`, story);
      log.published.push({ slug, title: story.title });
    } catch (e) {
      const reason = `error: ${e instanceof Error ? e.message : String(e)}`;
      const storyId = story && !dryRun ? await d.hold(story, reason).catch(() => undefined) : undefined;
      log.held.push({ headline: b.headline, reason, ...(storyId ? { storyId } : {}) });
    }
  }
  await save('log.json', log);
  return log;
}
