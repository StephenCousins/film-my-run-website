import { NEWS_CONFIG } from './config';
import type { Draft } from './types';

// A time or number is one word ("65:55:22", "1,329", "2.5"): counted as three, a
// plain result line ("won in a course record of 65:55:22") read as a ten-word copy.
const words = (s: string) => s.replace(/[’‘]/g, "'").toLowerCase().replace(/<[^>]+>/g, ' ').match(/[a-z0-9']+(?:[:.,][0-9]+)*/g) ?? [];

function shingles(text: string, n: number): Set<string> {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

/** Everything code can check before a story goes live. Empty means it passes. */
export function ruleProblems(d: Draft, sourceTexts: string[], sourceNames: string[] = []): string[] {
  const problems: string[] = [];
  if (!d.title.trim()) problems.push('no title');
  if (!d.excerpt.trim()) problems.push('no excerpt');
  // The unverified-information note is a footnote, not a paragraph of the story.
  const nonBlank = d.paragraphs.map((p) => p.trim()).filter((p) => p.length > 0 && !p.startsWith('* '));
  if (nonBlank.length === 0) problems.push('no body');
  if (nonBlank.length < 3 || nonBlank.length > 6) problems.push(`${nonBlank.length} paragraphs (3-6)`);
  const all = [d.title, d.excerpt, ...d.paragraphs].join('\n');
  // A spaced en dash (' – ') is the same "pause" tell as an em dash; an unspaced
  // en dash ("5–10") is a legitimate range and stays allowed.
  if (/—/.test(all) || /\s–\s/.test(all)) problems.push('em dash');
  if (/;/.test(all)) problems.push('semicolon');
  if (nearCopyPhrases(d, sourceTexts).length) problems.push('near-copy of a source');
  // The sources are credited at the end of the page, so the story never names them (Stephen, 2 Oct
  // 2026). Case-sensitive, a space optional ("RunUltra" for Run Ultra): a source's name is a proper
  // noun, and "Canadian running champs" doesn't name Canadian Running.
  for (const name of new Set(sourceNames)) {
    const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.join('').length >= 4 && new RegExp(`\\b${parts.join('\\s?')}\\b`).test(all)) problems.push(`names its source "${name}"`);
  }
  return problems;
}

/** The runs of words (NEWS_CONFIG.nearCopyWords long) a draft shares with any source. */
export function nearCopyPhrases(d: Draft, sourceTexts: string[]): string[] {
  const mine = shingles([d.title, d.excerpt, ...d.paragraphs].join('\n'), NEWS_CONFIG.nearCopyWords);
  const hits = new Set<string>();
  for (const t of sourceTexts) for (const s of shingles(t, NEWS_CONFIG.nearCopyWords)) if (mine.has(s)) hits.add(s);
  return [...hits];
}

/**
 * Fix what code can fix before anything is judged: an em dash or a spaced en dash
 * becomes a comma, a semicolon a full stop (Stephen doesn't use either). Ranges
 * like 5–10 keep their en dash.
 */
export function tidyPunctuation(d: Draft): Draft {
  const fix = (t: string) =>
    t
      .replace(/\s*—\s*/g, ', ')
      .replace(/\s+–\s+/g, ', ')
      .replace(/;\s*([a-z])/g, (_, c: string) => `. ${c.toUpperCase()}`)
      .replace(/;/g, '.')
      .replace(/,\s*,/g, ',');
  return { ...d, title: fix(d.title), excerpt: fix(d.excerpt), paragraphs: d.paragraphs.map(fix) };
}
