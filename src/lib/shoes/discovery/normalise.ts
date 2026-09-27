import { completeText } from '@/lib/llm';
import { resolveBrand, type Brand } from '../brands';
import { shoeToSlug } from '../slug';
import { parseModelVersion } from '../versions';
import type { Nomination } from './types';

export interface Resolved { brand: Brand; model: string; slug: string; nominations: Nomination[] }
export interface Unresolved { brandText: string; model: string; slug: string; nominations: Nomination[] }

export interface NormaliseDeps { completeText: typeof completeText }

// A model with no version number is usually a line, not a shoe ("Clifton"),
// unless the LLM kept a distinguishing suffix ("Speedgoat GTX").
const VERSIONLESS_SUFFIX = /\b(gtx|plus|max|pro|elite|premium)\b/i;

/**
 * One LLM call turns raw headlines into (brand, model) pairs, then brands are
 * resolved against the catalogue and nominations grouped by slug. A brand the
 * source already knew (a brand page) beats whatever the LLM read from the title.
 */
export interface NormaliseResult {
  resolved: Resolved[];
  unresolved: Unresolved[];
  /** At least one batch's reply was not a JSON array (refusal, truncation past maxTokens, prose); the run should say so. */
  failed: boolean;
  /** Nominations lost with those batches. */
  dropped: number;
}

/** A batch's reply was not a JSON array; its head goes to the log so the digest's drop count has a cause. */
function warnUnparseable(text: string) {
  console.warn(`Shoe discovery: LLM normalise output was not a JSON array: ${JSON.stringify(text.slice(0, 200))}`);
}

/**
 * Rows per LLM call. One call for all 151 nominations on 27 Sep 2026 needed
 * ~7k output tokens against a 2,000 cap, was truncated, and dropped every
 * nomination; 40 rows fit well inside the cap, and a bad batch loses only itself.
 */
export const NORMALISE_BATCH = 40;

/** Reads headlines better than Flash Lite (no version number, odd brand spellings); one run a week, well under a penny. */
const NORMALISE_MODEL = 'google/gemini-2.5-flash';

type Row = { i?: unknown; brand?: unknown; model?: unknown };

async function normaliseBatch(noms: Nomination[], deps: NormaliseDeps): Promise<Row[] | null> {
  const rows = noms.map((n, i) => `${i}\t${n.brandText ?? ''}\t${n.title}`).join('\n');
  const text = await deps.completeText({
    model: NORMALISE_MODEL,
    maxTokens: 4000,
    prompt: `Each line below is "index<TAB>brand-if-known<TAB>headline" from a running-shoe website. For each line that is about ONE specific running shoe model, give the brand and the model name INCLUDING its version number or suffix (e.g. "Clifton 10", "1080 v14", "Ultra Raptor II", "Speedgoat 6 GTX"). Skip lines about several shoes, gear roundups, or no specific shoe.

${rows}

Reply with ONLY a JSON array, no markdown: [{"i": 0, "brand": "Hoka", "model": "Clifton 10"}]`,
  });
  const m = text.match(/\[[\s\S]*\]/);
  let parsed: unknown = null;
  if (m) try { parsed = JSON.parse(m[0]); } catch { /* reported below */ }
  if (!Array.isArray(parsed)) { warnUnparseable(text); return null; }
  return parsed as Row[];
}

export async function normalise(noms: Nomination[], brands: Brand[], deps: NormaliseDeps = { completeText }): Promise<NormaliseResult> {
  if (noms.length === 0) return { resolved: [], unresolved: [], failed: false, dropped: 0 };
  const picked: { nom: Nomination; row: Row }[] = [];
  let dropped = 0;
  for (let start = 0; start < noms.length; start += NORMALISE_BATCH) {
    const batch = noms.slice(start, start + NORMALISE_BATCH);
    const rows = await normaliseBatch(batch, deps);
    if (!rows) { dropped += batch.length; continue; }
    for (const raw of rows) {
      // Each row is whatever the LLM wrote: a non-string brand or model must not throw and fail the whole batch.
      const row = (raw && typeof raw === 'object' ? raw : {}) as Row;
      const nom = typeof row.i === 'number' ? batch[row.i] : undefined;
      if (nom) picked.push({ nom, row });
    }
  }

  const resolvedMap = new Map<string, Resolved>();
  const unresolvedMap = new Map<string, Unresolved>();
  for (const { nom, row } of picked) {
    const model = String(row.model ?? '').trim();
    if (!model || (parseModelVersion(model).pattern === 'none' && !VERSIONLESS_SUFFIX.test(model))) continue;
    const brandText = (nom.brandText ?? (typeof row.brand === 'string' ? row.brand : '')).trim();
    const brand = resolveBrand(brandText, brands);
    if (brand) {
      const slug = shoeToSlug(brand.name, model);
      const e = resolvedMap.get(slug);
      if (e) e.nominations.push(nom); else resolvedMap.set(slug, { brand, model, slug, nominations: [nom] });
    } else {
      const slug = shoeToSlug(brandText || 'unknown', model);
      const e = unresolvedMap.get(slug);
      if (e) e.nominations.push(nom); else unresolvedMap.set(slug, { brandText, model, slug, nominations: [nom] });
    }
  }
  return { resolved: [...resolvedMap.values()], unresolved: [...unresolvedMap.values()], failed: dropped > 0, dropped };
}
