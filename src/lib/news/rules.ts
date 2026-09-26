import { NEWS_CONFIG } from './config';
import type { Draft } from './types';

const words = (s: string) => s.replace(/[’‘]/g, "'").toLowerCase().replace(/<[^>]+>/g, ' ').match(/[a-z0-9']+/g) ?? [];

function shingles(text: string, n: number): Set<string> {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

/** Everything code can check before a story goes live. Empty means it passes. */
export function ruleProblems(d: Draft, sourceTexts: string[]): string[] {
  const problems: string[] = [];
  if (!d.title.trim()) problems.push('no title');
  if (!d.excerpt.trim()) problems.push('no excerpt');
  const nonBlank = d.paragraphs.map((p) => p.trim()).filter((p) => p.length > 0);
  if (nonBlank.length === 0) problems.push('no body');
  if (nonBlank.length < 3 || nonBlank.length > 6) problems.push(`${nonBlank.length} paragraphs (3-6)`);
  const all = [d.title, d.excerpt, ...d.paragraphs].join('\n');
  // A spaced en dash (' – ') is the same "pause" tell as an em dash; an unspaced
  // en dash ("5–10") is a legitimate range and stays allowed.
  if (/—/.test(all) || /\s–\s/.test(all)) problems.push('em dash');
  if (/;/.test(all)) problems.push('semicolon');
  const mine = shingles(all, NEWS_CONFIG.nearCopyWords);
  if (sourceTexts.some((t) => [...shingles(t, NEWS_CONFIG.nearCopyWords)].some((s) => mine.has(s)))) problems.push('near-copy of a source');
  return problems;
}
