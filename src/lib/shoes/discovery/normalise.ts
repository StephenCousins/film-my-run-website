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
export async function normalise(noms: Nomination[], brands: Brand[], deps: NormaliseDeps = { completeText }): Promise<{ resolved: Resolved[]; unresolved: Unresolved[] }> {
  if (noms.length === 0) return { resolved: [], unresolved: [] };
  const rows = noms.map((n, i) => `${i}\t${n.brandText ?? ''}\t${n.title}`).join('\n');
  const text = await deps.completeText({
    maxTokens: 2000,
    prompt: `Each line below is "index<TAB>brand-if-known<TAB>headline" from a running-shoe website. For each line that is about ONE specific running shoe model, give the brand and the model name INCLUDING its version number or suffix (e.g. "Clifton 10", "1080 v14", "Ultra Raptor II", "Speedgoat 6 GTX"). Skip lines about several shoes, gear roundups, or no specific shoe.

${rows}

Reply with ONLY a JSON array, no markdown: [{"i": 0, "brand": "Hoka", "model": "Clifton 10"}]`,
  });
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return { resolved: [], unresolved: [] };
  let parsed: { i: number; brand?: string; model?: string }[];
  try { parsed = JSON.parse(m[0]); } catch { return { resolved: [], unresolved: [] }; }
  if (!Array.isArray(parsed)) return { resolved: [], unresolved: [] };

  const resolvedMap = new Map<string, Resolved>();
  const unresolvedMap = new Map<string, Unresolved>();
  for (const row of parsed) {
    const nom = noms[row?.i];
    if (!nom) continue;
    const model = String(row.model ?? '').trim();
    if (!model || (parseModelVersion(model).pattern === 'none' && !VERSIONLESS_SUFFIX.test(model))) continue;
    const brandText = (nom.brandText ?? row.brand ?? '').trim();
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
  return { resolved: [...resolvedMap.values()], unresolved: [...unresolvedMap.values()] };
}
