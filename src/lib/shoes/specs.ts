import { completeText } from '@/lib/llm';
import { isShoeCategory, isShoeTerrain } from './taxonomy';
import type { ShoeCategory, ShoeTerrain } from '@prisma/client';

export interface ParsedSpecs {
  terrain: ShoeTerrain;
  category: ShoeCategory;
  description: string | null;
  drop_mm: number | null;
  weight_g: number | null;
  stack_height_mm: number | null;
  price_gbp: number | null;
  release_year: number | null;
}

export interface SpecsDeps {
  completeText: typeof completeText;
}

export interface SpecsInput {
  brand: string;
  model: string;
  context: string;
  /** Laid over the LLM's reply before validation, so a valid terrain/category from the owner rescues an invalid one from the model. */
  overrides?: Partial<ParsedSpecs>;
}

export async function parseShoeSpecs(
  input: SpecsInput,
  deps: SpecsDeps = { completeText }
): Promise<ParsedSpecs> {
  const text = await deps.completeText({
    maxTokens: 400,
    prompt: `Extract running shoe details for the ${input.brand} ${input.model} from this page content.

Content:
${input.context.slice(0, 3000)}

Reply with ONLY valid JSON (no markdown):
{
  "terrain": "road" | "trail" | "both",
  "category": "daily_trainer" | "race" | "long_run" | "speed" | "ultra" | "stability" | "max_cushion" | "minimal",
  "description": "One sentence description of the shoe",
  "drop_mm": number or null,
  "weight_g": number or null (men's weight),
  "stack_height_mm": number or null (heel),
  "price_gbp": number or null (price in pence, e.g. 16000 for £160),
  "release_year": number or null
}

Rules: only include specs stated in the content; use null otherwise. terrain and category must be one of the listed values.`,
  });
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('specs_unparseable');
  const j = { ...JSON.parse(m[0]), ...input.overrides };
  if (!isShoeTerrain(j.terrain) || !isShoeCategory(j.category)) throw new Error('bad_taxonomy');
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  return {
    terrain: j.terrain,
    category: j.category,
    description: typeof j.description === 'string' ? j.description : null,
    drop_mm: num(j.drop_mm),
    weight_g: num(j.weight_g),
    stack_height_mm: num(j.stack_height_mm),
    price_gbp: num(j.price_gbp),
    release_year: num(j.release_year),
  };
}
