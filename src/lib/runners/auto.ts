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
/** Write, check and up to two edits on Opus: about 10p, rounded up for the ceiling check. */
export const PROFILE_ESTIMATE_USD = 0.15;

type Entry = { name: string; slug?: string; reason?: string };

export interface AutoDeps {
  known: () => Promise<Set<string>>;
  gather: (name: string) => Promise<RunnerFile | null>;
  write: typeof writeProfile;
  check: typeof checkProfile;
  edit: typeof editProfile;
  save: (f: RunnerFile) => Promise<{ slug: string }>;
}

const liveDeps: AutoDeps = {
  known: async () => new Set((await loadNameIndex()).keys()),
  gather: (name) => gatherRunner({ name }),
  write: (f) => writeProfile(f),
  check: (f, b) => checkProfile(f, b),
  edit: (f, b, fix) => editProfile(f, b, fix),
  save: (f) => saveRunner(f, 'auto'),
};

const tidy = (bio: string[]) => tidyPunctuation({ title: '', excerpt: '', paragraphs: bio }).paragraphs;

/**
 * A page for each runner a new story is about who has none yet (spec: "a new name
 * in a news story has a page by the next morning"). Same fact rules as a story:
 * edits for what the checker can't find, an asterisk in the last round, never
 * held. Auto pages have no photos (the card) until a session picks them.
 */
export async function autoProfiles(names: string[], budgetUsd: number, deps: AutoDeps = liveDeps): Promise<{ log: Entry[]; costUsd: number }> {
  const known = await deps.known();
  const log: Entry[] = [];
  let costUsd = 0;
  let made = 0;
  for (const name of [...new Set(names.map((n) => n.trim()).filter((n) => n.split(/\s+/).length >= 2))]) {
    if (known.has(name)) continue;
    if (made >= AUTO_PROFILES_PER_DAY) { log.push({ name, reason: `over the ${AUTO_PROFILES_PER_DAY}-a-day limit` }); continue; }
    if (budgetUsd - costUsd < PROFILE_ESTIMATE_USD) { log.push({ name, reason: 'monthly ceiling' }); continue; }
    try {
      const f = await deps.gather(name);
      if (!f) { log.push({ name, reason: 'no UTMB entry or Wikipedia article' }); continue; }
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
      made++;
      log.push({ name, slug });
    } catch (e) {
      log.push({ name, reason: `error: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}` });
    }
  }
  return { log, costUsd };
}
