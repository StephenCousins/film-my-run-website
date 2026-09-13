import { describe, it, expect } from 'vitest';
import { searchNominations } from './search';

describe('searchNominations', () => {
  it('runs the three discovery queries and turns each result into a nomination', async () => {
    const queries: string[] = [];
    let slept = 0;
    const r = await searchNominations({
      webSearch: async (q, count) => {
        queries.push(q);
        expect(count).toBe(8);
        return [{ title: `Hoka Clifton 10 Review (${q})`, url: 'https://example.com/clifton-10', description: 'd' }];
      },
      sleep: async () => { slept++; },
      now: () => new Date('2026-09-13T10:00:00Z'),
    });
    expect(queries).toEqual([
      'best new running shoes September 2026',
      'new trail running shoes 2026',
      'new road running shoes 2026',
    ]);
    expect(slept).toBe(3);
    expect(r.source).toBe('search');
    expect(r.empty).toBe(false);
    expect(r.nominations).toHaveLength(3);
    expect(r.nominations[0]).toEqual({
      modelText: 'Hoka Clifton 10 Review (best new running shoes September 2026)',
      title: 'Hoka Clifton 10 Review (best new running shoes September 2026)',
      url: 'https://example.com/clifton-10',
      publishedAt: null,
      source: 'search',
    });
  });
  it('skips a failed query and carries on', async () => {
    let calls = 0;
    const r = await searchNominations({
      webSearch: async () => { calls++; if (calls === 1) throw new Error('429'); return [{ title: 'T', url: 'https://e.com/t', description: '' }]; },
      sleep: async () => {},
      now: () => new Date(),
    });
    expect(calls).toBe(3);
    expect(r.nominations).toHaveLength(2);
    expect(r.error).toBeUndefined();
  });
  it('is empty with an error when every query fails', async () => {
    const r = await searchNominations({
      webSearch: async () => { throw new Error('no key'); },
      sleep: async () => {},
      now: () => new Date(),
    });
    expect(r).toMatchObject({ source: 'search', empty: true, nominations: [] });
    expect(r.error).toBe('no key');
  });
});
