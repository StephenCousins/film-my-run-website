import { describe, it, expect } from 'vitest';
import { parseUserQuery } from './parseUserQuery';

const llm = (reply: string) => ({ completeText: async () => reply });

describe('parseUserQuery', () => {
  it('parses the JSON object the LLM returns, ignoring any wrapping', async () => {
    const r = await parseUserQuery('hoka clifton 10', llm('Sure:\n```json\n{"brand": "Hoka", "model": "Clifton 10"}\n```'));
    expect(r).toEqual({ brand: 'Hoka', model: 'Clifton 10' });
  });
  it('sends the query in the prompt once', async () => {
    const prompts: string[] = [];
    await parseUserQuery('brooks ghost 17', { completeText: async ({ prompt }) => { prompts.push(prompt); return '{"brand":"Brooks","model":"Ghost 17"}'; } });
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('brooks ghost 17');
  });
  it('throws on garbage', async () => {
    await expect(parseUserQuery('asdf', llm('I have no idea'))).rejects.toThrow(/which shoe/);
    await expect(parseUserQuery('asdf', llm('{not json'))).rejects.toThrow(/which shoe/);
    await expect(parseUserQuery('best shoes', llm('{"brand": "", "model": ""}'))).rejects.toThrow(/which shoe/);
  });
  it('asks for a version when the model is a bare line', async () => {
    await expect(parseUserQuery('hoka clifton', llm('{"brand": "Hoka", "model": "Clifton"}'))).rejects.toThrow(/Which version/);
  });
  it('accepts a versionless model with a distinguishing suffix', async () => {
    await expect(parseUserQuery('speedgoat gtx', llm('{"brand": "Hoka", "model": "Speedgoat GTX"}'))).resolves.toEqual({ brand: 'Hoka', model: 'Speedgoat GTX' });
  });
});
