import { prisma } from '@/lib/db';
import type { Bundle, Candidate } from '@/lib/news/types';
import { loadNameIndex, mentionedSlugs } from './names';
import type { BestFinish } from './types';

export const RUNNER_FILE_SOURCE = 'Film My Run runner file';

type Row = { slug: string; name: string; nationality: string | null; utmb_index: number | null; bio: string; best_finishes: unknown };

/**
 * A bio may keep a fact nobody could verify, marked with a trailing `*` (a whole
 * paragraph of just the note, or an asterisk straight after the sentence: see
 * UNVERIFIED_NOTE in news/write.ts). As a source fed to the news writer and
 * fact-checker, that fact must not survive unmarked: drop the whole paragraph it's
 * in (a sentence-level split breaks on a decimal like "2:05.3*." and can let the
 * marked fact through), which also removes the note paragraph itself.
 */
function verifiedBioText(bioHtml: string): string {
  const paragraphs = bioHtml.replace(/<\/p>\s*<p>/g, '\n\n').replace(/<[^>]+>/g, '').trim().split(/\n\n+/);
  return paragraphs
    .map((p) => p.trim())
    .filter((p) => p && !p.includes('*'))
    .join('\n\n');
}

export function profileText(r: Row): string {
  const finishes = (r.best_finishes as BestFinish[]) ?? [];
  return [
    `${r.name}${r.nationality ? ` (${r.nationality})` : ''}.`,
    r.utmb_index !== null ? `UTMB Index ${r.utmb_index}.` : '',
    verifiedBioText(r.bio),
    finishes.length ? `Best finishes:\n${finishes.map((b) => `${b.year}: ${[b.race, b.distance, b.time, b.position].filter(Boolean).join(', ')}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

export function toCandidate(r: Row, now: Date): Candidate {
  return { articleId: 0, url: `https://filmmyrun.com/runners/${r.slug}`, source: RUNNER_FILE_SOURCE, title: r.name, pubDate: now, summary: '', text: profileText(r), imageUrl: null, photoCredit: null };
}

/** Our file on every runner a bundle's sources name: one more source for the writer and the fact-check. */
export async function runnerCandidates(b: Bundle, now = new Date()): Promise<Candidate[]> {
  const index = await loadNameIndex();
  const slugs = new Set<string>();
  for (const i of b.items) for (const s of mentionedSlugs(`<p>${i.title}\n${i.text ?? i.summary}</p>`, index)) slugs.add(s);
  if (!slugs.size) return [];
  const rows = await prisma.runners.findMany({ where: { slug: { in: [...slugs] }, status: 'published' }, select: { slug: true, name: true, nationality: true, utmb_index: true, bio: true, best_finishes: true } });
  return rows.map((r) => toCandidate(r, now));
}
