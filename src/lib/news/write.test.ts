import { describe, expect, it } from 'vitest';
import { checkFacts, writeStory } from './write';
import type { Bundle } from './types';

const bundle: Bundle = { key: 'k', headline: 'h', alreadyCovered: false, verdicts: [],
  items: [{ articleId: 1, url: 'https://x.test/1', source: 'iRunFar', title: 'T', pubDate: new Date(), summary: 's', text: null, imageUrl: null, photoCredit: null }] };

describe('writing', () => {
  it('a bundle with no full text is refused before any model call', async () => {
    let called = false;
    const r = await writeStory(bundle, new Date(), (async () => { called = true; return { data: null, costUsd: 0, raw: '' }; }) as never);
    expect(called).toBe(false);
    expect(r.refusal).toBe('no full text');
  });
  it("the checker's unsupported list fails the story", async () => {
    const call = async () => ({ costUsd: 0.02, raw: '', data: { unsupported: ['19:37 finish time'] } });
    const r = await checkFacts({ title: 't', excerpt: 'e', paragraphs: ['a', 'b', 'c'] }, { ...bundle, items: [{ ...bundle.items[0], text: 'full' }] }, call as never);
    expect(r.ok).toBe(false);
    expect(r.unsupported).toEqual(['19:37 finish time']);
  });
});
