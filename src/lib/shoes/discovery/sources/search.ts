import { webSearch, sleep } from '../../search';
import type { Nomination, SourceResult } from '../types';

export interface SearchDeps {
  webSearch: typeof webSearch;
  sleep: typeof sleep;
  now: () => Date;
}

const liveDeps: SearchDeps = { webSearch, sleep, now: () => new Date() };

export function discoveryQueries(now: Date): string[] {
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  return [
    `best new running shoes ${month} ${year}`,
    `new trail running shoes ${year}`,
    `new road running shoes ${year}`,
  ];
}

/**
 * Web-search nominator. Every result becomes a nomination as-is — no LLM
 * here; the resolver downstream works out which titles name a real shoe.
 */
export async function searchNominations(deps: SearchDeps = liveDeps): Promise<SourceResult> {
  const source = 'search';
  const nominations: Nomination[] = [];
  let lastError: string | undefined;
  for (const query of discoveryQueries(deps.now())) {
    try {
      for (const r of await deps.webSearch(query, 8)) {
        if (!r.title || !r.url) continue;
        nominations.push({ modelText: r.title, title: r.title, url: r.url, publishedAt: null, source });
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await deps.sleep(1100); // Brave free tier: 1 request/second
  }
  const result: SourceResult = { source, nominations, empty: nominations.length === 0 };
  if (result.empty && lastError) result.error = lastError;
  return result;
}
