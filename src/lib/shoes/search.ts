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

// ── Serper (Google results fallback) ────────────────────────────────

async function serperWebSearch(query: string, count = 8): Promise<SearchResult[]> {
  const key = getSerperKey();
  if (!key) return [];
  try {
    const res = await fetch('https://google.serper.dev/search', {
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

async function serperImageSearch(query: string, count = 8): Promise<ImageSearchResult[]> {
  const key = getSerperKey();
  if (!key) return [];
  try {
    const res = await fetch('https://google.serper.dev/images', {
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

async function braveWebSearch(query: string, count = 8): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': getBraveKey() },
  });
  if (!res.ok) {
    console.error(`Brave search failed (${res.status}): ${query}`);
    return [];
  }
  const data = await res.json();
  return (data.web?.results ?? []).map((r: Record<string, string>) => ({
    title: r.title ?? '', url: r.url ?? '', description: r.description ?? '',
  }));
}

async function braveImageSearch(query: string, count = 8): Promise<ImageSearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en&safesearch=strict`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': getBraveKey() },
  });
  if (!res.ok) {
    console.error(`Brave image search failed (${res.status}): ${query}`);
    return [];
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

export async function webSearch(query: string, count = 8): Promise<SearchResult[]> {
  const results = await braveWebSearch(query, count);
  if (results.length > 0) return results;
  return serperWebSearch(query, count);
}

export async function imageSearch(query: string, count = 8): Promise<ImageSearchResult[]> {
  const results = await braveImageSearch(query, count);
  if (results.length > 0) return results;
  return serperImageSearch(query, count);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
