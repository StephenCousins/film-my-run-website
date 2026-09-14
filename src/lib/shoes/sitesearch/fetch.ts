export interface SiteFetchDeps { fetch: typeof fetch }

export const liveSiteFetchDeps: SiteFetchDeps = { fetch: (...args) => fetch(...args) };

export const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const TIMEOUT_MS = 15000;

/**
 * One fetch for every site adapter, with fetchPage's three outcomes so the
 * callers can tell "the site has no such page" from "the site refused us":
 * the body on a 2xx, `null` on 404/410, and a thrown `unreachable:<status|
 * timeout|network>` for everything else (403, 406, 429, 5xx, no response).
 * Search pages are bigger and slower than product pages, hence 15 s.
 */
export async function fetchSiteText(url: string, deps: SiteFetchDeps = liveSiteFetchDeps, accept = 'text/html,application/xhtml+xml,*/*'): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await deps.fetch(url, { headers: { 'User-Agent': CHROME_UA, Accept: accept }, redirect: 'follow', signal: controller.signal });
    } catch {
      throw new Error(`unreachable:${controller.signal.aborted ? 'timeout' : 'network'}`);
    }
    if (res.status === 404 || res.status === 410) return null;
    if (!res.ok) throw new Error(`unreachable:${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/** Was this a refusal (the site is up but would not serve us), as opposed to a page that is not there? */
export function isUnreachable(err: unknown): err is Error {
  return err instanceof Error && err.message.startsWith('unreachable:');
}
