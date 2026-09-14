import { describe, it, expect } from 'vitest';
import { parseShoeSpecs } from './specs';

const input = { brand: 'Hoka', model: 'Clifton 10', context: 'Weight 250g, drop 5mm, £140' };
const replying = (text: string) => ({ completeText: async () => text });
const good = { terrain: 'road', category: 'daily_trainer', description: 'A cushioned daily trainer.', drop_mm: 5, weight_g: 250, stack_height_mm: 40, price_gbp: 14000, release_year: 2026 };

describe('parseShoeSpecs', () => {
  it('parses a clean reply, tolerating prose around the JSON', async () => {
    const specs = await parseShoeSpecs(input, replying(`Here you go:\n${JSON.stringify(good)}\nHope that helps.`));
    expect(specs).toEqual(good);
  });
  it('throws specs_unparseable when there is no JSON object in the reply', async () => {
    await expect(parseShoeSpecs(input, replying('I could not find the specs.'))).rejects.toThrow('specs_unparseable');
  });
  it('throws specs_unparseable on JSON cut off before its closing brace, and a SyntaxError on malformed JSON', async () => {
    await expect(parseShoeSpecs(input, replying('{"terrain": "road", "category": "daily_tr'))).rejects.toThrow('specs_unparseable');
    await expect(parseShoeSpecs(input, replying('{"terrain": "road", "category": }'))).rejects.toThrow(SyntaxError);
  });
  it('throws bad_taxonomy on a terrain or category outside the enums, including case drift', async () => {
    await expect(parseShoeSpecs(input, replying(JSON.stringify({ ...good, terrain: 'Road' })))).rejects.toThrow('bad_taxonomy');
    await expect(parseShoeSpecs(input, replying(JSON.stringify({ ...good, category: 'tempo' })))).rejects.toThrow('bad_taxonomy');
    await expect(parseShoeSpecs(input, replying(JSON.stringify({ ...good, terrain: null })))).rejects.toThrow('bad_taxonomy');
  });
  it('applies overrides before validation, so a valid category rescues an invalid one from the LLM', async () => {
    const reply = replying(JSON.stringify({ ...good, category: 'supershoe' }));
    await expect(parseShoeSpecs(input, reply)).rejects.toThrow('bad_taxonomy');
    expect(await parseShoeSpecs({ ...input, overrides: { category: 'race' } }, reply)).toEqual({ ...good, category: 'race' });
    await expect(parseShoeSpecs({ ...input, overrides: { terrain: 'trail' } }, reply)).rejects.toThrow('bad_taxonomy');
  });
  it('rounds numbers, nulls anything that is not a finite number, and nulls a non-string description', async () => {
    const specs = await parseShoeSpecs(input, replying(JSON.stringify({
      ...good, drop_mm: 5.4, weight_g: '250', stack_height_mm: 39.5, price_gbp: Infinity, release_year: null, description: 42,
    })));
    expect(specs).toMatchObject({ drop_mm: 5, weight_g: null, stack_height_mm: 40, price_gbp: null, release_year: null, description: null });
  });
  it('sends the brand, model and at most 3000 characters of context', async () => {
    let seen = '';
    await parseShoeSpecs({ ...input, context: 'x'.repeat(5000) }, { completeText: async ({ prompt }) => { seen = prompt; return JSON.stringify(good); } });
    expect(seen).toContain('Hoka Clifton 10');
    expect(seen).toContain('x'.repeat(3000));
    expect(seen).not.toContain('x'.repeat(3001));
  });
});
