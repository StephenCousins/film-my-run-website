// ── Search providers ────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface ImageSearchResult {
  fullUrl: string | null;
  thumbnailUrl: string | null;
  pageUrl: string;
  title: string;
}

function getBraveKey(): string {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) throw new Error('BRAVE_SEARCH_API_KEY is not set');
  return key;
}

function getSerperKey(): string | null {
  return process.env.SERPER_API_KEY ?? null;
}

export interface SearchDeps { fetch: typeof fetch }
const liveDeps: SearchDeps = { fetch: (...args) => fetch(...args) };

/** Brave answered with a status, not results: null means "fall back or fail", never "no results". */
class BraveError extends Error {
  constructor(public readonly status: number) { super(`search:${status}`); }
}

// ── Serper (Google results fallback) ────────────────────────────────

async function serperWebSearch(query: string, count: number, deps: SearchDeps): Promise<SearchResult[]> {
  const key = getSerperKey();
  if (!key) return [];
  try {
    const res = await deps.fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: count, gl: 'gb' }),
    });
    if (!res.ok) {
      console.error(`Serper search failed (${res.status}): ${query}`);
      return [];
    }
    const data = await res.json();
    return (data.organic ?? []).map((r: Record<string, string>) => ({
      title: r.title ?? '', url: r.link ?? '', description: r.snippet ?? '',
    }));
  } catch {
    return [];
  }
}

async function serperImageSearch(query: string, count: number, deps: SearchDeps): Promise<ImageSearchResult[]> {
  const key = getSerperKey();
  if (!key) return [];
  try {
    const res = await deps.fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: count, gl: 'gb' }),
    });
    if (!res.ok) {
      console.error(`Serper image search failed (${res.status}): ${query}`);
      return [];
    }
    const data = await res.json();
    return (data.images ?? []).map((r: Record<string, string>) => ({
      fullUrl: r.imageUrl ?? null,
      thumbnailUrl: r.thumbnailUrl ?? r.imageUrl ?? null,
      pageUrl: r.link ?? '',
      title: r.title ?? '',
    })).filter((r: ImageSearchResult) => r.thumbnailUrl);
  } catch {
    return [];
  }
}

// ── Brave Search (primary) ──────────────────────────────────────────

async function braveWebSearch(query: string, count: number, deps: SearchDeps): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en`;
  const res = await deps.fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': getBraveKey() },
  });
  if (!res.ok) {
    console.error(`Brave search failed (${res.status}): ${query}`);
    throw new BraveError(res.status);
  }
  const data = await res.json();
  return (data.web?.results ?? []).map((r: Record<string, string>) => ({
    title: r.title ?? '', url: r.url ?? '', description: r.description ?? '',
  }));
}

async function braveImageSearch(query: string, count: number, deps: SearchDeps): Promise<ImageSearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en&safesearch=strict`;
  const res = await deps.fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': getBraveKey() },
  });
  if (!res.ok) {
    console.error(`Brave image search failed (${res.status}): ${query}`);
    throw new BraveError(res.status);
  }
  const data = await res.json();
  return ((data.results ?? []) as Record<string, unknown>[])
    .map((r) => {
      const props = r.properties as Record<string, string> | undefined;
      const thumb = r.thumbnail as Record<string, string> | undefined;
      return {
        fullUrl: props?.url ?? null,
        thumbnailUrl: thumb?.src ?? null,
        pageUrl: (r.url as string) ?? '',
        title: (r.title as string) ?? '',
      };
    })
    .filter((r: ImageSearchResult) => r.thumbnailUrl);
}

// ── Unified search (Brave → Serper fallback) ────────────────────────

/**
 * Brave first; Serper when Brave returns nothing or fails and a Serper key
 * is configured. A Brave 401/402/429 with no fallback throws `search:<status>`
 * rather than returning []: an empty result would read as "no brand page"
 * and "fewer than two reviews" for every candidate in the run, and eight
 * weeks of that auto-rejects real shoes. A thrown error lands in `errored`.
 */
async function withFallback<T>(brave: () => Promise<T[]>, serper: () => Promise<T[]>): Promise<T[]> {
  let results: T[];
  try {
    results = await brave();
  } catch (err) {
    if (err instanceof BraveError && getSerperKey()) return serper();
    throw err;
  }
  if (results.length > 0) return results;
  return serper();
}

export async function webSearch(query: string, count = 8, deps: SearchDeps = liveDeps): Promise<SearchResult[]> {
  return withFallback(() => braveWebSearch(query, count, deps), () => serperWebSearch(query, count, deps));
}

export async function imageSearch(query: string, count = 8, deps: SearchDeps = liveDeps): Promise<ImageSearchResult[]> {
  return withFallback(() => braveImageSearch(query, count, deps), () => serperImageSearch(query, count, deps));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
