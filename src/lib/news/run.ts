import { mkdir, writeFile } from 'node:fs/promises';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { NEWS_CONFIG } from './config';
import { gatherCandidates } from './gather';
import { bundleImportance, groupItems } from './group';
import { storyImage } from './image';
import { isStale, pickBundles, slugBase, STORY_ESTIMATE_USD, uniqueSlug, withinCeiling } from './plan';
import { nearCopyPhrases, ruleProblems, tidyPunctuation } from './rules';
import { moreCoverage } from './search';
import { runnerCandidates, RUNNER_FILE_SOURCE } from '@/lib/runners/runner-file';
import { autoProfiles } from '@/lib/runners/auto';
import { isBorderline, passesSort, sortItem } from './sort';
import type { Bundle, Candidate, Draft, RunLog, StoryToPublish, Verdict } from './types';
import { checkFacts, writeStory, editStory, type Fix } from './write';

type Seen = { c: Candidate; v: Verdict | null; bundleKey?: string };

export interface RunDeps {
  gather: (now: Date) => Promise<Candidate[]>;
  sort: (c: Candidate) => ReturnType<typeof sortItem>;
  group: (items: { c: Candidate; v: Verdict }[], recent: string[]) => ReturnType<typeof groupItems>;
  write: (b: Bundle, now: Date, avoid?: string[], unsupported?: string[]) => ReturnType<typeof writeStory>;
  /** Puts right only what the checks flagged (editStory). */
  edit: (d: Draft, b: Bundle, fix: Fix) => Promise<{ draft: Draft | null; costUsd: number }>;
  /** Other sites' reports of the event, when its own source can't be read or stands alone. */
  more: (b: Bundle, now: Date) => Promise<{ items: Candidate[]; costUsd: number }>;
  /** Our runner files for the runners a bundle names (a source for writer and checker). */
  runnerFiles: (b: Bundle) => Promise<Candidate[]>;
  /** Runner pages for the people new stories name (runners/auto.ts). */
  autoProfiles: (names: string[], budgetUsd: number) => Promise<{ log: RunLog['profiles']; costUsd: number }>;
  check: (d: Draft, b: Bundle) => ReturnType<typeof checkFacts>;
  image: typeof storyImage;
  publish: (s: StoryToPublish) => Promise<void>;
  /** Saves the story unpublished with its reason; returns its id for `npm run news:publish <id>`. */
  hold: (s: StoryToPublish, reason: string) => Promise<number>;
  monthSpentUsd: (now: Date) => Promise<number>;
  /** Titles from the last 14 days, published or held: what the grouper's alreadyCovered check must see. */
  recentHeadlines: (now: Date) => Promise<string[]>;
  takenSlugs: () => Promise<Set<string>>;
  /** Slugs of news_stories rows created in the last 14 days, used to catch a same-event duplicate before it publishes as -2. */
  recentSlugs: (now: Date) => Promise<Set<string>>;
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
  write: (b, now, avoid, unsupported) => writeStory(b, now, undefined, avoid, unsupported),
  edit: (d, b, fix) => editStory(d, b, fix),
  more: (b, now) => moreCoverage(b, now),
  runnerFiles: (b) => runnerCandidates(b),
  autoProfiles: (names, budget) => autoProfiles(names, budget),
  check: (d, b) => checkFacts(d, b),
  image: storyImage,
  publish: async (s) => { await saveStory(s, 'published', null); },
  hold: (s, reason) => saveStory(s, 'held', reason),
  monthSpentUsd: async (now) => {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const r = await prisma.news_runs.aggregate({ _sum: { cost_usd: true }, where: { started_at: { gte: from } } });
    return r._sum.cost_usd ?? 0;
  },
  recentHeadlines: async (now) => (await prisma.news_stories.findMany({ where: { status: { in: ['published', 'held'] }, created_at: { gte: new Date(now.getTime() - NEWS_CONFIG.windowDays * 86_400_000) } }, select: { title: true } })).map((s) => s.title),
  takenSlugs: async () => new Set((await prisma.news_stories.findMany({ select: { slug: true } })).map((s) => s.slug)),
  recentSlugs: async (now) => new Set((await prisma.news_stories.findMany({ where: { created_at: { gte: new Date(now.getTime() - NEWS_CONFIG.windowDays * 86_400_000) } }, select: { slug: true } })).map((s) => s.slug)),
  markSeen: async (items) => {
    for (const { c, v, bundleKey } of items) {
      if (c.articleId <= 0) continue; // a page found on the web or handed in, not a feed item
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

/** An error's message, cut to 300 characters for the log and the email. */
export function errorText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.length > 300 ? `${m.slice(0, 300)}…` : m;
}

/** Thrown when a run fails partway; `log` holds what was done and spent before the failure. */
export class NewsRunError extends Error {
  constructor(readonly cause: unknown, readonly log: RunLog) {
    super(errorText(cause));
  }
}

type RunOpts = { now: Date; dryRun: boolean; outDir?: string; deps?: Partial<RunDeps>; maxStories?: number };

export async function runNews(opts: RunOpts): Promise<RunLog> {
  const log: RunLog = { dryRun: opts.dryRun, itemsSeen: 0, sortedOut: [], borderline: [], ungrouped: [], skipped: [], notPublished: [], published: [], costUsd: 0, stoppedByCeiling: false, profiles: [] };
  try {
    return await run(log, opts);
  } catch (e) {
    throw new NewsRunError(e, log);
  }
}

async function run(log: RunLog, { now, dryRun, outDir, deps = {}, maxStories }: RunOpts): Promise<RunLog> {
  const d: RunDeps = { ...liveDeps, ...deps };
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
  // A reference-only source (Marathon Investigation) can back up a story, never lead one.
  const referenceOnly = (b: Bundle) => b.items.every((i) => NEWS_CONFIG.referenceOnlySources.includes(i.source));
  for (const b of grouped.bundles.filter(referenceOnly)) {
    log.skipped.push({ headline: b.headline, reason: 'reference-only source' });
    b.alreadyCovered = true; // out of the running, and marked seen below
  }
  // Waited too long (isStale): dropped for good, so it isn't looked at again tomorrow.
  for (const b of grouped.bundles.filter((x) => !x.alreadyCovered && isStale(x, now))) {
    log.skipped.push({ headline: b.headline, reason: 'too old' });
    b.alreadyCovered = true;
    b.stale = true;
  }
  const covered = grouped.bundles.filter((b) => b.alreadyCovered);
  for (const b of covered) if (!referenceOnly(b) && !b.stale) log.skipped.push({ headline: b.headline, reason: 'already covered' });
  await markSeen([...sorted.filter((s) => !passesSort(s.v)), ...covered.flatMap(bundleSeen)]);

  // maxStories: a one-off larger run (the launch fill); the daily cap otherwise.
  const cap = maxStories ?? NEWS_CONFIG.maxStoriesPerRun;
  const picked = pickBundles(grouped.bundles, cap, now);
  for (const b of grouped.bundles) {
    if (!b.alreadyCovered && !picked.includes(b)) log.skipped.push({ headline: b.headline, reason: `over the ${cap}-story cap` });
  }

  const taken = await d.takenSlugs();
  const recentSlugs = await d.recentSlugs(now);
  const monthBefore = await d.monthSpentUsd(now);
  const people: string[] = [];
  for (const b of picked) {
    if (log.stoppedByCeiling || !withinCeiling(monthBefore + log.costUsd, STORY_ESTIMATE_USD)) {
      log.stoppedByCeiling = true;
      log.skipped.push({ headline: b.headline, reason: 'monthly ceiling' });
      continue;
    }
    let story: StoryToPublish | null = null;
    try {
      await markSeen(bundleSeen(b));
      // Our own runner files first: facts the writer can use without a web search.
      b.items.push(...(await d.runnerFiles(b).catch((e) => { console.error('runnerFiles failed:', e); return []; })));
      // Its own source unreadable or alone: look for other sites' reports first (after
      // markSeen, so web finds, articleId 0, are never recorded as feed items).
      if (b.items.filter((i) => i.text && i.source !== RUNNER_FILE_SOURCE).length < 2) {
        const more = await d.more(b, now);
        log.costUsd += more.costUsd;
        b.items.push(...more.items);
      }
      const w = await d.write(b, now);
      log.costUsd += w.costUsd;
      if (!w.draft) { log.notPublished.push({ headline: b.headline, reason: w.refusal ?? 'no draft' }); continue; }
      const slug = uniqueSlug(w.draft.title, taken);
      taken.add(slug);
      const lead = b.verdicts.reduce((a, v) => (v.importance > a.importance ? v : a), b.verdicts[0]);
      story = {
        ...w.draft, slug, topic: lead.topic, isUk: b.verdicts.some((v) => v.isUk), importance: bundleImportance(b),
        sources: b.items.filter((i) => i.source !== RUNNER_FILE_SOURCE).map((i) => ({ site: i.source, url: i.url })), imageUrl: null, photoCredit: null,
        bundleKey: b.key, articleIds: b.items.map((i) => i.articleId).filter((id) => id > 0),
      };
      if (recentSlugs.has(slugBase(w.draft.title))) {
        // The same event slugged again within the window: a duplicate, not a fresh -2 story.
        log.notPublished.push({ headline: b.headline, reason: 'duplicate of a recent story' });
        continue;
      }
      // Every picked story is published or not; none is held for review (Stephen, 27 Sep
      // 2026). What the checks flag gets put right: punctuation in code, then up to
      // NEWS_CONFIG.fixRounds of edits. A fact nobody can find is first looked for (more
      // coverage), then taken out or corrected, and in the last round kept with an asterisk
      // and "Film My Run could not verify this information" if the story needs it.
      // Our own bio reusing its own words is not a near-copy; the fact-checker (which
      // reads the whole bundle) still sees the runner file.
      const texts = () => b.items.filter((i) => i.source !== RUNNER_FILE_SOURCE).map((i) => i.text ?? '');
      let draft = tidyPunctuation(w.draft);
      let reason: string | null = null;
      let searched = b.items.filter((i) => i.text && i.source !== RUNNER_FILE_SOURCE).length >= 2 ? false : true; // `more` already ran above
      for (let round = 0; ; round++) {
        const last = round >= NEWS_CONFIG.fixRounds;
        const problems = ruleProblems(draft, texts());
        if (problems.length) {
          if (last) { reason = problems.join(', '); break; }
          const phrases = problems.includes('near-copy of a source') ? nearCopyPhrases(draft, texts()) : [];
          const e = await d.edit(draft, b, { problems: problems.filter((p) => p !== 'near-copy of a source'), phrases });
          log.costUsd += e.costUsd;
          if (e.draft) draft = tidyPunctuation(e.draft);
          continue;
        }
        const c = await d.check(draft, b);
        log.costUsd += c.costUsd;
        if (c.ok) break;
        if (c.unsupported.includes('checker reply unreadable')) { if (last) { reason = 'the fact-check could not be read'; break; } continue; }
        if (!searched) {
          // Verify first: other sites' reports may carry what the checker couldn't find.
          searched = true;
          const more = await d.more(b, now);
          log.costUsd += more.costUsd;
          if (more.items.length) { b.items.push(...more.items); continue; }
        }
        if (last) {
          const e = await d.edit(draft, b, { mark: c.unsupported });
          log.costUsd += e.costUsd;
          if (e.draft && ruleProblems(e.draft, texts()).length === 0) { draft = tidyPunctuation(e.draft); break; }
          reason = `unsupported: ${c.unsupported.join('; ')}`;
          break;
        }
        const e = await d.edit(draft, b, { unsupported: c.unsupported });
        log.costUsd += e.costUsd;
        if (e.draft) draft = tidyPunctuation(e.draft);
      }
      Object.assign(story, draft, { sources: b.items.filter((i) => i.source !== RUNNER_FILE_SOURCE).map((i) => ({ site: i.source, url: i.url })) });
      if (reason) {
        log.notPublished.push({ headline: b.headline, reason });
        await save(`${slug}.not-published.json`, { reason, story });
        continue;
      }
      const img = !dryRun ? await d.image(b, slug) : outDir ? await d.image(b, slug, { upload: saveLocally(outDir) }) : null;
      story.imageUrl = img?.url || null;
      story.photoCredit = img?.credit ?? null;
      if (!dryRun) await d.publish(story);
      await save(`${slug}.json`, story);
      log.published.push({ slug, title: story.title });
      people.push(...(story.people ?? []));
    } catch (e) {
      log.notPublished.push({ headline: b.headline, reason: `error: ${errorText(e)}` });
    }
  }
  // Pages for the runners today's stories are about who have none yet. Never on a dry run.
  if (!dryRun && people.length) {
    const budget = NEWS_CONFIG.monthlyCeilingGbp * NEWS_CONFIG.usdPerGbp - (monthBefore + log.costUsd);
    const p = await d.autoProfiles(people, budget).catch((e) => ({ log: [{ name: people.join(', '), reason: `error: ${errorText(e)}` }], costUsd: 0 }));
    log.profiles.push(...p.log);
    log.costUsd += p.costUsd;
  }

  await save('log.json', log);
  return log;
}
