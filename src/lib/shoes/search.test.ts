import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webSearch } from './search';

type Call = { url: string; init?: RequestInit };

/** A fetch that answers Brave and Serper by host; records every call. */
function fakeFetch(answers: { brave?: { status: number; body?: unknown }; serper?: { status: number; body?: unknown } }, calls: Call[] = []) {
  const fetch: typeof globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const a = url.includes('brave.com') ? answers.brave : answers.serper;
    if (!a) throw new Error(`unexpected fetch ${url}`);
    return { ok: a.status >= 200 && a.status < 300, status: a.status, json: async () => a.body ?? {} } as unknown as Response;
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

const braveBody = { web: { results: [{ title: 'Clifton 10', url: 'https://www.hoka.com/clifton-10', description: 'd' }] } };
const serperBody = { organic: [{ title: 'Clifton 10 (google)', link: 'https://www.hoka.com/clifton-10', snippet: 's' }] };

describe('webSearch', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.BRAVE_SEARCH_API_KEY = 'brave';
    delete process.env.SERPER_API_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { process.env = { ...env }; vi.restoreAllMocks(); });

  it('maps Brave results', async () => {
    const { fetch, calls } = fakeFetch({ brave: { status: 200, body: braveBody } });
    expect(await webSearch('x', 5, { fetch })).toEqual([{ title: 'Clifton 10', url: 'https://www.hoka.com/clifton-10', description: 'd' }]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('count=5');
  });
  it('throws search:<status> on a Brave 401, 402 or 429 with no Serper key', async () => {
    for (const status of [401, 402, 429, 500]) {
      const { fetch } = fakeFetch({ brave: { status } });
      await expect(webSearch('x', 8, { fetch })).rejects.toThrow(`search:${status}`);
    }
  });
  it('falls back to Serper on a Brave failure when a Serper key is configured', async () => {
    process.env.SERPER_API_KEY = 'serper';
    const { fetch, calls } = fakeFetch({ brave: { status: 429 }, serper: { status: 200, body: serperBody } });
    expect(await webSearch('x', 8, { fetch })).toEqual([{ title: 'Clifton 10 (google)', url: 'https://www.hoka.com/clifton-10', description: 's' }]);
    expect(calls.map(c => new URL(c.url).hostname)).toEqual(['api.search.brave.com', 'google.serper.dev']);
  });
  it('falls back to Serper on zero Brave results, and returns [] when there is no Serper key', async () => {
    process.env.SERPER_API_KEY = 'serper';
    const { fetch, calls } = fakeFetch({ brave: { status: 200, body: { web: { results: [] } } }, serper: { status: 200, body: serperBody } });
    expect(await webSearch('x', 8, { fetch })).toHaveLength(1);
    expect(calls).toHaveLength(2);
    delete process.env.SERPER_API_KEY;
    const none = fakeFetch({ brave: { status: 200, body: { web: { results: [] } } } });
    expect(await webSearch('x', 8, { fetch: none.fetch })).toEqual([]);
    expect(none.calls).toHaveLength(1);
  });
  it('a Brave network error propagates whether or not Serper is configured', async () => {
    const fetch: typeof globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    await expect(webSearch('x', 8, { fetch })).rejects.toThrow('fetch failed');
    process.env.SERPER_API_KEY = 'serper';
    await expect(webSearch('x', 8, { fetch })).rejects.toThrow('fetch failed');
  });
});
