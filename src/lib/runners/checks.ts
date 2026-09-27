import { ruleProblems } from '@/lib/news/rules';
import { AGENCY_CREDITS, type RunnerFile } from './types';

/** An agency's own domain, whatever the credit line says (spec: automated invoices). */
const AGENCY_HOSTS = /gettyimages|shutterstock|alamy|reuters|apnews|afp|pa-?images/i;

function agencyHost(url: string): boolean {
  try {
    return AGENCY_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Everything code checks before a profile is saved. Empty means it can be published. */
export function profileProblems(f: RunnerFile): string[] {
  const problems: string[] = [];
  if (!f.name.trim() || !f.slug.trim()) problems.push('no name or slug');
  else if (!SLUG_RE.test(f.slug)) problems.push(`invalid slug: ${f.slug}`);
  const bio = (f.bio ?? []).map((p) => p.trim()).filter(Boolean);
  const paragraphs = bio.filter((p) => !p.startsWith('* '));
  if (paragraphs.length < 3 || paragraphs.length > 5) problems.push(`${paragraphs.length} paragraphs (3-5)`);
  // The news rules on the bio as a draft: punctuation and near-copy. Its own 3-6 count is replaced by 3-5 above.
  const texts = f.texts.map((t) => t.text);
  for (const p of ruleProblems({ title: f.name, excerpt: f.name, paragraphs: bio }, texts)) if (!/paragraphs \(3-6\)|no body/.test(p)) problems.push(p);
  const sources = f.sources ?? [];
  if (sources.length === 0) problems.push('no sources');
  const names = new Set(sources.map((s) => s.name));
  for (const b of f.bestFinishes ?? []) {
    if (!names.has(b.source)) problems.push(`best finish "${b.race} ${b.year}" cites ${b.source}, not a listed source`);
  }
  const photos = f.photos ?? [];
  for (const kind of ['portrait', 'action'] as const) {
    const of = photos.filter((p) => p.kind === kind);
    if (of.length > 1) problems.push(`two ${kind} photos`);
    for (const p of of) {
      if (!p.credit.trim()) problems.push(`${kind} photo has no credit`);
      if (!p.source_url.trim()) problems.push(`${kind} photo has no source page`);
      if (AGENCY_CREDITS.test(p.credit)) problems.push(`agency photo (${kind}): ${p.credit}`);
      if (agencyHost(p.source_url) || agencyHost(p.url)) problems.push(`agency photo host (${kind}): ${p.source_url || p.url}`);
    }
  }
  return problems;
}
