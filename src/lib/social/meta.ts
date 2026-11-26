// Facebook Page + Instagram posting through Meta's official Graph API (docs/social-posts.md).
//
// The access token only ever travels in the Authorization header, never in a URL, and no
// error message we keep or log can contain it (cleanError).

/** Graph API version. v24.0 came out in Oct 2025; Meta supports each version for about two years. */
export const GRAPH_VERSION = 'v24.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/*
 * The hard account lock (Stephen, 26 Nov 2026). His Meta login also manages other Pages and
 * Instagram accounts (NoblePro's, e.g. @nobleprorunner), and posts must only ever go to Film My
 * Run's. So:
 * - the targets come ONLY from env vars (META_FB_PAGE_ID, META_IG_USER_ID), with a Page access
 *   token for the Film My Run Page alone (META_FB_PAGE_ACCESS_TOKEN). Nothing here ever lists
 *   accounts (/me/accounts) or picks one;
 * - before posting, verifyAccountLock() asks Meta who those IDs really are and compares the
 *   usernames with META_FB_PAGE_USERNAME_EXPECTED and META_IG_USERNAME_EXPECTED (both
 *   'filmmyrun'), and checks the token belongs to that Page. Any mismatch or failed lookup:
 *   nothing is posted anywhere and the admin switch is turned off (post.ts).
 */
export interface MetaCredentials {
  pageId: string;
  igUserId: string;
  /** A Page access token for the Film My Run Page only, never a user token. */
  token: string;
  /** The Page's username, as in facebook.com/<username>. */
  fbUsernameExpected: string;
  /** The Instagram @username, without the @. */
  igUsernameExpected: string;
}

/** The five env vars the social step needs. All required; blank counts as unset. */
export const META_ENV = {
  pageId: 'META_FB_PAGE_ID',
  igUserId: 'META_IG_USER_ID',
  token: 'META_FB_PAGE_ACCESS_TOKEN',
  fbUsernameExpected: 'META_FB_PAGE_USERNAME_EXPECTED',
  igUsernameExpected: 'META_IG_USERNAME_EXPECTED',
} as const;

const clean = (v: string | undefined) => v?.trim() || '';
/** A username as typed in an env var or returned by Meta: no spaces, no leading @. */
const handle = (v: string | undefined) => clean(v).replace(/^@/, '');

/**
 * The five Meta settings, or null when any is missing, empty or blank (GitHub passes an
 * unset secret as ''). Null means the social step never calls Meta.
 */
export function metaCredentials(env: Record<string, string | undefined> = process.env): MetaCredentials | null {
  const c = {
    pageId: clean(env[META_ENV.pageId]),
    igUserId: clean(env[META_ENV.igUserId]),
    token: clean(env[META_ENV.token]),
    fbUsernameExpected: handle(env[META_ENV.fbUsernameExpected]),
    igUsernameExpected: handle(env[META_ENV.igUsernameExpected]),
  };
  return Object.values(c).every(Boolean) ? c : null;
}

/** The locked targets for the admin page: no token, only the end of the Page ID. */
export function metaTarget(env: Record<string, string | undefined> = process.env) {
  const pageId = clean(env[META_ENV.pageId]);
  return {
    fbUsername: handle(env[META_ENV.fbUsernameExpected]) || null,
    igUsername: handle(env[META_ENV.igUsernameExpected]) || null,
    pageIdLast4: pageId ? pageId.slice(-4) : null,
    igUserIdLast4: clean(env[META_ENV.igUserId]).slice(-4) || null,
    present: Object.fromEntries(Object.values(META_ENV).map((k) => [k, !!clean(env[k])])) as Record<string, boolean>,
  };
}

export interface MetaDeps {
  fetch?: typeof fetch;
  /** Waits between Instagram status checks; tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
}

export interface PlatformResult {
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

const REQUEST_TIMEOUT_MS = 30_000;
/** Instagram usually finishes a single photo in a few seconds; give it about a minute. */
const IG_POLL_TRIES = 12;
const IG_POLL_MS = 5_000;

/** An error's message with the token blanked out, cut short for the log and the admin table. */
export function cleanError(e: unknown, token: string): string {
  let m = e instanceof Error ? e.message : String(e);
  if (token) m = m.split(token).join('[token]');
  return m.split('\n')[0].slice(0, 300);
}

class GraphError extends Error {}

/** One Graph API call. `path` is logged-safe (no token, no query); the token goes in the header. */
async function graph(
  creds: MetaCredentials,
  method: 'GET' | 'POST',
  path: string,
  params: Record<string, string>,
  doFetch: typeof fetch,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params);
  const url = method === 'GET' && Object.keys(params).length ? `${GRAPH_BASE}${path}?${body}` : `${GRAPH_BASE}${path}`;
  const res = await doFetch(url, {
    method,
    headers: { Authorization: `Bearer ${creds.token}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    ...(method === 'POST' ? { body: body.toString() } : {}),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = json.error as { message?: string; code?: number } | undefined;
    throw new GraphError(`${method} ${path}: HTTP ${res.status}${err?.code ? ` code ${err.code}` : ''}${err?.message ? `: ${err.message}` : ''}`);
  }
  return json;
}

/** Same username? Trimmed, no @, case-insensitive, otherwise exact. */
export function sameUsername(actual: unknown, expected: string): boolean {
  return typeof actual === 'string' && handle(actual).toLowerCase() === handle(expected).toLowerCase() && handle(expected) !== '';
}

export type LockResult = { ok: true; pageName: string | null } | { ok: false; reason: string };

/**
 * Is everything we are about to post to really Film My Run's? Three cheap GETs, token in the
 * header: who the token belongs to (a Page token answers /me with the Page's own id), the
 * Page's username, the Instagram account's username. The first problem, or any failed lookup,
 * is a refusal; the reason starts "account lock:". Never throws.
 */
export async function verifyAccountLock(creds: MetaCredentials, deps: MetaDeps = {}): Promise<LockResult> {
  const doFetch = deps.fetch ?? fetch;
  try {
    const me = await graph(creds, 'GET', '/me', { fields: 'id' }, doFetch);
    if (String(me.id ?? '') !== creds.pageId) return { ok: false, reason: 'account lock: the token is not the Film My Run Page token' };

    const page = await graph(creds, 'GET', `/${creds.pageId}`, { fields: 'username,name' }, doFetch);
    if (!sameUsername(page.username, creds.fbUsernameExpected)) {
      const name = typeof page.name === 'string' ? ` ("${page.name}")` : '';
      return { ok: false, reason: `account lock: Facebook Page is '${typeof page.username === 'string' ? page.username : 'no username'}'${name}, expected '${creds.fbUsernameExpected}'` };
    }

    const ig = await graph(creds, 'GET', `/${creds.igUserId}`, { fields: 'username' }, doFetch);
    if (!sameUsername(ig.username, creds.igUsernameExpected)) {
      return { ok: false, reason: `account lock: Instagram account is '${typeof ig.username === 'string' ? ig.username : 'no username'}', expected '${creds.igUsernameExpected}'` };
    }
    return { ok: true, pageName: typeof page.name === 'string' ? page.name : null };
  } catch (e) {
    return { ok: false, reason: `account lock: could not check the accounts (${cleanError(e, creds.token)})` };
  }
}

/** The card on the Page's timeline: POST /{page-id}/photos (url, message, published). */
export async function postToFacebook(creds: MetaCredentials, imageUrl: string, caption: string, deps: MetaDeps = {}): Promise<PlatformResult> {
  const doFetch = deps.fetch ?? fetch;
  try {
    const r = await graph(creds, 'POST', `/${creds.pageId}/photos`, { url: imageUrl, message: caption, published: 'true' }, doFetch);
    const postId = String(r.post_id ?? r.id ?? '');
    if (!postId) throw new GraphError('Facebook returned no post id');
    return { ok: true, id: postId, url: `https://www.facebook.com/${postId}` };
  } catch (e) {
    return { ok: false, error: cleanError(e, creds.token) };
  }
}

/**
 * Instagram's three steps: make a media container (image_url + caption), wait for its
 * status_code to be FINISHED, then publish it. The permalink is one more cheap GET; if that
 * fails the post still counts.
 */
export async function postToInstagram(creds: MetaCredentials, imageUrl: string, caption: string, deps: MetaDeps = {}): Promise<PlatformResult> {
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  try {
    const container = await graph(creds, 'POST', `/${creds.igUserId}/media`, { image_url: imageUrl, caption }, doFetch);
    const containerId = String(container.id ?? '');
    if (!containerId) throw new GraphError('Instagram returned no container id');

    let status = '';
    for (let i = 0; i < IG_POLL_TRIES; i++) {
      status = String((await graph(creds, 'GET', `/${containerId}`, { fields: 'status_code' }, doFetch)).status_code ?? '');
      if (status === 'FINISHED') break;
      if (status === 'ERROR' || status === 'EXPIRED') throw new GraphError(`Instagram container ${status}`);
      await sleep(IG_POLL_MS);
    }
    if (status !== 'FINISHED') throw new GraphError(`Instagram container not ready (${status || 'no status'})`);

    const published = await graph(creds, 'POST', `/${creds.igUserId}/media_publish`, { creation_id: containerId }, doFetch);
    const mediaId = String(published.id ?? '');
    if (!mediaId) throw new GraphError('Instagram returned no media id');

    const permalink = await graph(creds, 'GET', `/${mediaId}`, { fields: 'permalink' }, doFetch)
      .then((r) => (typeof r.permalink === 'string' ? r.permalink : undefined))
      .catch(() => undefined);
    return { ok: true, id: mediaId, url: permalink };
  } catch (e) {
    return { ok: false, error: cleanError(e, creds.token) };
  }
}
