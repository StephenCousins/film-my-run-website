import { prisma } from '@/lib/db';
import { NEWS_CONFIG } from '@/lib/news/config';
import { nearCopyPhrases, tidyPunctuation } from '@/lib/news/rules';
import { UNVERIFIED_NOTE } from '@/lib/news/write';
import { profileProblems } from './checks';
import { gatherRunner } from './gather';
import { loadNameIndex } from './names';
import { saveRunner } from './save';
import type { RunnerFile } from './types';
import { checkProfile, editProfile, writeProfile } from './write';

export const AUTO_PROFILES_PER_DAY = 3;
/** Write, check and up to NEWS_CONFIG.fixRounds rounds of edits on Opus, several pence; rounded up for the ceiling check. */
export const PROFILE_ESTIMATE_USD = 0.15;
/** Never more than this from one run, whatever's left of the monthly ceiling. */
export const PROFILE_RUN_BUDGET_USD = 1.0;

type Entry = { name: string; slug?: string; reason?: string };

/** Reasons that don't mean the name is a dud: a limit, not a fact or a rule problem. Never held against it later. */
const NOT_A_FAILURE = /^(over the \d+-a-day limit|monthly ceiling|out of time|already has a page)$/;

export interface AutoDeps {
  known: () => Promise<Set<string>>;
  /** Any runners row with this slug, whatever its status or written_by: never overwrite an existing page. */
  slugTaken: (slug: string) => Promise<boolean>;
  /** How many auto pages already went out today (UTC), so this run's cap is what's left of AUTO_PROFILES_PER_DAY. */
  autoToday: () => Promise<number>;
  /** Names that failed for a real reason (not a limit) in the last 14 days: not tried again. */
  recentFailures: () => Promise<Set<string>>;
  gather: (name: string) => Promise<RunnerFile | null>;
  write: typeof writeProfile;
  check: typeof checkProfile;
  edit: typeof editProfile;
  save: (f: RunnerFile) => Promise<{ slug: string }>;
  /** Wall-clock budget for starting new names, ms; default 8 minutes (like refresh.ts). */
  deadlineMs?: number;
  /** The clock the deadline is measured against; defaults to Date.now. */
  clock?: () => number;
}

const liveDeps: AutoDeps = {
  known: async () => new Set((await loadNameIndex()).keys()),
  slugTaken: async (slug) => (await prisma.runners.findUnique({ where: { slug }, select: { slug: true } })) !== null,
  autoToday: async () => prisma.runners.count({ where: { written_by: 'auto', created_at: { gte: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`) } } }),
  recentFailures: async () => {
    const since = new Date(Date.now() - 14 * 86_400_000);
    const rows = await prisma.news_runs.findMany({ where: { started_at: { gte: since } }, select: { summary: true } });
    const names = new Set<string>();
    for (const r of rows) {
      const profiles = (r.summary as { profiles?: Entry[] } | null)?.profiles ?? [];
      for (const p of profiles) {
        if (p.slug || !p.reason || NOT_A_FAILURE.test(p.reason)) continue;
        names.add(p.name);
      }
    }
    return names;
  },
  gather: (name) => gatherRunner({ name }),
  write: (f) => writeProfile(f),
  check: (f, b) => checkProfile(f, b),
  edit: (f, b, fix) => editProfile(f, b, fix),
  save: (f) => saveRunner(f, 'auto'),
};

const tidy = (bio: string[]) => tidyPunctuation({ title: '', excerpt: '', paragraphs: bio }).paragraphs;

/** Trim, collapse whitespace, curly apostrophes to straight: the same identity names.ts's index uses. */
const norm = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/[‘’]/g, "'");

/**
 * A page for each runner a new story is about who has none yet (spec: "a new name
 * in a news story has a page by the next morning"). Same fact rules as a story:
 * edits for what the checker can't find, an asterisk in the last round, never
 * held. Auto pages have no photos (the card) until a session picks them.
 *
 * Guards on top of the fact rules: never overwrite an existing page (slugTaken,
 * checked after gather resolves the canonical name/slug); the day cap counts every
 * name that reaches the writer, success or not, and is topped up by what's already
 * gone out today; a run keeps its own small budget on top of the monthly ceiling;
 * an 8-minute deadline stops it starting anything new; two names that resolve to
 * the same person in one run only try the first; a name that failed for a real
 * reason in the last 14 days isn't retried.
 */
export async function autoProfiles(names: string[], budgetUsd: number, deps: AutoDeps = liveDeps): Promise<{ log: Entry[]; costUsd: number }> {
  const clock = deps.clock ?? Date.now;
  const deadline = clock() + (deps.deadlineMs ?? 8 * 60_000);
  const known = await deps.known();
  const autoToday = await deps.autoToday();
  const recentFailures = await deps.recentFailures();
  const cap = Math.max(0, AUTO_PROFILES_PER_DAY - autoToday);
  const runBudget = Math.min(budgetUsd, PROFILE_RUN_BUDGET_USD);
  const queue = [...new Set(names.map(norm).filter((n) => n.split(/\s+/).length >= 2))];
  const log: Entry[] = [];
  const handledSlugs = new Set<string>();
  let costUsd = 0;
  let attempts = 0;
  for (let i = 0; i < queue.length; i++) {
    if (clock() >= deadline) {
      for (const name of queue.slice(i)) log.push({ name, reason: 'out of time' });
      break;
    }
    const name = queue[i];
    if (known.has(name)) continue;
    if (recentFailures.has(name)) { log.push({ name, reason: 'failed recently' }); continue; }
    if (attempts >= cap) { log.push({ name, reason: `over the ${AUTO_PROFILES_PER_DAY}-a-day limit` }); continue; }
    if (runBudget - costUsd < PROFILE_ESTIMATE_USD) { log.push({ name, reason: 'monthly ceiling' }); continue; }
    try {
      const f = await deps.gather(name);
      if (!f) { log.push({ name, reason: 'no UTMB entry or Wikipedia article' }); continue; }
      if (await deps.slugTaken(f.slug)) { log.push({ name, reason: 'already has a page' }); continue; }
      if (handledSlugs.has(f.slug)) { log.push({ name, reason: 'same person, already handled this run' }); continue; }
      handledSlugs.add(f.slug);
      attempts++;
      const w = await deps.write(f);
      costUsd += w.costUsd;
      if (!w.bio) { log.push({ name, reason: 'the writer returned nothing' }); continue; }
      let bio = tidy(w.bio);
      const texts = f.texts.map((t) => t.text);
      const file = (b: string[]): RunnerFile => ({ ...f, bio: b, bestFinishes: f.results.slice(0, 10), photos: [], sources: f.texts.map((t) => t.source) });
      let reason: string | null = null;
      for (let round = 0; ; round++) {
        const last = round >= NEWS_CONFIG.fixRounds;
        const problems = profileProblems(file(bio));
        if (problems.length) {
          if (last) { reason = problems.join(', '); break; }
          const phrases = problems.includes('near-copy of a source') ? nearCopyPhrases({ title: '', excerpt: '', paragraphs: bio }, texts) : [];
          const e = await deps.edit(f, bio, { problems: problems.filter((p) => p !== 'near-copy of a source'), phrases });
          costUsd += e.costUsd;
          if (e.bio) bio = tidy(e.bio);
          continue;
        }
        const c = await deps.check(f, bio);
        costUsd += c.costUsd;
        if (c.unsupported.length === 0) break;
        if (last) {
          const e = await deps.edit(f, bio, { mark: c.unsupported });
          costUsd += e.costUsd;
          const marked = e.bio ? tidy(e.bio).filter((p) => p.trim() !== UNVERIFIED_NOTE) : null;
          if (marked && marked.some((p) => p.includes('*'))) marked.push(UNVERIFIED_NOTE);
          if (marked && profileProblems(file(marked)).length === 0) { bio = marked; break; }
          reason = `unsupported: ${c.unsupported.join('; ')}`;
          break;
        }
        const e = await deps.edit(f, bio, { unsupported: c.unsupported });
        costUsd += e.costUsd;
        if (e.bio) bio = tidy(e.bio);
      }
      if (reason) { log.push({ name, reason }); continue; }
      const { slug } = await deps.save(file(bio));
      log.push({ name, slug });
    } catch (e) {
      log.push({ name, reason: `error: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}` });
    }
  }
  return { log, costUsd };
}
