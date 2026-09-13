import { completeText } from '@/lib/llm';
import { parseModelVersion } from './versions';

export interface ParseUserQueryDeps { completeText: typeof completeText }

export interface UserQuery { brand: string; model: string }

// Same rule as discovery's normalise: a model with no version is a line, not
// a shoe, unless it carries a distinguishing suffix ("Speedgoat GTX").
const VERSIONLESS_SUFFIX = /\b(gtx|plus|max|pro|elite|premium)\b/i;

/**
 * One LLM call turns a visitor's free text ("hoka clifton 10", "the new
 * Brooks Ghost") into a (brand, model) pair. Throws with a message fit for
 * the modal when the reply is not a usable shoe; the caller resolves the
 * brand against the catalogue.
 */
export async function parseUserQuery(query: string, deps: ParseUserQueryDeps = { completeText }): Promise<UserQuery> {
  const text = await deps.completeText({
    maxTokens: 100,
    prompt: `A visitor typed this into a running-shoe finder: "${query.replace(/"/g, "'")}"

If it names ONE specific running shoe, give the brand and the model name INCLUDING its version number or suffix (e.g. "Clifton 10", "1080 v14", "Ultra Raptor II", "Speedgoat 6 GTX"). Capitalise properly. If it is not a specific running shoe, reply with {"brand": "", "model": ""}.

Reply with ONLY a JSON object, no markdown: {"brand": "Hoka", "model": "Clifton 10"}`,
  });
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Could not work out which shoe you mean. Try "brand model version", e.g. Hoka Clifton 10');
  let parsed: { brand?: unknown; model?: unknown };
  try { parsed = JSON.parse(m[0]); } catch { throw new Error('Could not work out which shoe you mean. Try "brand model version", e.g. Hoka Clifton 10'); }
  const brand = String(parsed?.brand ?? '').trim();
  const model = String(parsed?.model ?? '').trim();
  if (!brand || !model) throw new Error('Could not work out which shoe you mean. Try "brand model version", e.g. Hoka Clifton 10');
  if (parseModelVersion(model).pattern === 'none' && !VERSIONLESS_SUFFIX.test(model)) {
    throw new Error(`Which version of the ${brand} ${model}? Include the number, e.g. "${brand} ${model} 3"`);
  }
  return { brand, model };
}
