import { prisma } from '@/lib/db';

export interface RunnerName { slug: string; name: string; aliases: string[] }

/** Straight and curly apostrophes are the same letter for matching. */
const norm = (s: string) => s.trim().replace(/['']/g, "'");

/**
 * Every name and alias to the slug it belongs to. A single word ("Kilian") is too
 * loose to link, and a name two runners share links neither: never the wrong person.
 */
export function nameIndex(runners: RunnerName[]): Map<string, string> {
  const owners = new Map<string, Set<string>>();
  for (const r of runners) {
    for (const raw of [r.name, ...r.aliases]) {
      const n = norm(raw);
      if (n.split(/\s+/).length < 2) continue;
      if (!owners.has(n)) owners.set(n, new Set());
      owners.get(n)!.add(r.slug);
    }
  }
  const out = new Map<string, string>();
  for (const [n, slugs] of owners) if (slugs.size === 1) out.set(n, [...slugs][0]);
  return out;
}

function nameRegex(names: string[]): RegExp {
  const alts = [...names]
    .sort((a, b) => b.length - a.length) // longest first: "Kilian Jornet Burgada" before "Kilian Jornet"
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "[''']"));
  return new RegExp(`(?<![\\p{L}\\p{N}])(${alts.join('|')})(?![\\p{L}\\p{N}])`, 'gu');
}

const SKIP_TAG = /^<(\/?)(a|h[1-6]|figcaption)\b/i;

/**
 * Links the first mention of each runner in a story's HTML. Done when the page is
 * shown, never saved, so older stories pick up runners added later. `onLink` hears
 * every runner linked (mentionedSlugs uses it, so "In the news" always agrees).
 */
export function linkRunners(html: string, index: Map<string, string>, onLink?: (slug: string) => void): string {
  if (index.size === 0) return html;
  const re = nameRegex([...index.keys()]);
  const linked = new Set<string>();
  let skip = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        const m = part.match(SKIP_TAG);
        if (m) skip = Math.max(0, skip + (m[1] ? -1 : 1));
        return part;
      }
      if (skip > 0) return part;
      return part.replace(re, (text: string) => {
        const slug = index.get(norm(text));
        if (!slug || linked.has(slug)) return text;
        linked.add(slug);
        onLink?.(slug);
        return `<a href="/runners/${slug}" class="runner-link">${text}</a>`;
      });
    })
    .join('');
}

export function mentionedSlugs(html: string, index: Map<string, string>): Set<string> {
  const out = new Set<string>();
  linkRunners(html, index, (s) => out.add(s));
  return out;
}

/** The index over every published runner (about 150 rows; one query per page view). */
export async function loadNameIndex(): Promise<Map<string, string>> {
  const rows = await prisma.runners.findMany({ where: { status: 'published' }, select: { slug: true, name: true, aliases: true } });
  return nameIndex(rows);
}
