import { describe, expect, it, vi } from 'vitest';
import { GRAPH_BASE, cleanError, metaCredentials, metaTarget, postToFacebook, postToInstagram, sameUsername, verifyAccountLock } from './meta';

const creds = { pageId: 'PAGE1', igUserId: 'IG1', token: 'SECRET-TOKEN-123', fbUsernameExpected: 'filmmyrun', igUsernameExpected: 'filmmyrun' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A fake Graph API: answers by method + path, records every call. */
function graph(routes: Record<string, (body: URLSearchParams) => Response | Response[]>) {
  const calls: { method: string; url: string; body: URLSearchParams; auth: string | null }[] = [];
  const queues = new Map<string, Response[]>();
  const fetchFn = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = new URL(String(url));
    const method = init?.method ?? 'GET';
    const body = new URLSearchParams(method === 'GET' ? u.search : String(init?.body ?? ''));
    calls.push({ method, url: String(url), body, auth: new Headers(init?.headers).get('authorization') });
    const key = `${method} ${u.pathname.replace(/^\/v[\d.]+/, '')}`;
    if (!queues.has(key)) {
      const r = routes[key]?.(body);
      if (!r) return json({ error: { message: `no route ${key}` } }, 404);
      queues.set(key, Array.isArray(r) ? r : [r]);
    }
    const q = queues.get(key)!;
    return q.length > 1 ? q.shift()! : q[0].clone();
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

const ENV = {
  META_FB_PAGE_ID: '1234567890', META_IG_USER_ID: '178414', META_FB_PAGE_ACCESS_TOKEN: 't',
  META_FB_PAGE_USERNAME_EXPECTED: 'filmmyrun', META_IG_USERNAME_EXPECTED: '@filmmyrun',
};

describe('Meta credentials', () => {
  it('all five or nothing; blank counts as unset (GitHub passes a missing secret as "")', () => {
    expect(metaCredentials(ENV)).toEqual({ pageId: '1234567890', igUserId: '178414', token: 't', fbUsernameExpected: 'filmmyrun', igUsernameExpected: 'filmmyrun' });
    for (const k of Object.keys(ENV)) {
      expect(metaCredentials({ ...ENV, [k]: '  ' })).toBeNull();
      expect(metaCredentials({ ...ENV, [k]: undefined })).toBeNull();
    }
    expect(metaCredentials({})).toBeNull();
  });
  it('the old names no longer count', () => {
    expect(metaCredentials({ META_PAGE_ID: '1', META_IG_USER_ID: '2', META_ACCESS_TOKEN: 't' })).toBeNull();
  });
  it('the admin target shows usernames and the end of the Page ID, never the token', () => {
    const t = metaTarget(ENV);
    expect(t).toMatchObject({ fbUsername: 'filmmyrun', igUsername: 'filmmyrun', pageIdLast4: '7890' });
    expect(JSON.stringify(t)).not.toContain('"t"');
    expect(t.present.META_FB_PAGE_ACCESS_TOKEN).toBe(true);
  });
  it('error text never carries the token', () => {
    expect(cleanError(new Error('bad token SECRET-TOKEN-123 here'), creds.token)).toBe('bad token [token] here');
  });
});

describe('the account lock', () => {
  const lockGraph = (me: unknown, page: unknown, ig: unknown) => graph({
    'GET /me': () => (me instanceof Response ? me : json(me)),
    'GET /PAGE1': () => (page instanceof Response ? page : json(page)),
    'GET /IG1': () => (ig instanceof Response ? ig : json(ig)),
  });
  it('usernames match, trimmed and case-insensitive; the token is the Page\'s', async () => {
    const { fetchFn, calls } = lockGraph({ id: 'PAGE1' }, { username: ' FilmMyRun ', name: 'Film My Run' }, { username: 'filmmyrun' });
    expect(await verifyAccountLock(creds, { fetch: fetchFn })).toEqual({ ok: true, pageName: 'Film My Run' });
    expect(calls.map((c) => new URL(c.url).pathname.replace(/^\/v[\d.]+/, '') + new URL(c.url).search)).toEqual(['/me?fields=id', '/PAGE1?fields=username%2Cname', '/IG1?fields=username']);
    expect(calls.every((c) => c.auth === 'Bearer SECRET-TOKEN-123' && !c.url.includes('SECRET'))).toBe(true);
    expect(calls.some((c) => c.url.includes('/accounts'))).toBe(false);
  });
  it('matches on username, not display name', async () => {
    const { fetchFn } = lockGraph({ id: 'PAGE1' }, { username: 'nobleprorunning', name: 'filmmyrun' }, { username: 'filmmyrun' });
    const r = await verifyAccountLock(creds, { fetch: fetchFn });
    expect(r).toEqual({ ok: false, reason: "account lock: Facebook Page is 'nobleprorunning' (\"filmmyrun\"), expected 'filmmyrun'" });
  });
  it('a wrong Instagram account is refused', async () => {
    const { fetchFn } = lockGraph({ id: 'PAGE1' }, { username: 'filmmyrun' }, { username: 'nobleprorunner' });
    expect(await verifyAccountLock(creds, { fetch: fetchFn })).toEqual({ ok: false, reason: "account lock: Instagram account is 'nobleprorunner', expected 'filmmyrun'" });
  });
  it('a token that is not the Page\'s own (a user token answers /me with the person) is refused', async () => {
    const { fetchFn } = lockGraph({ id: 'USER9' }, { username: 'filmmyrun' }, { username: 'filmmyrun' });
    expect(await verifyAccountLock(creds, { fetch: fetchFn })).toEqual({ ok: false, reason: 'account lock: the token is not the Film My Run Page token' });
  });
  it('a failed lookup is a refusal, never a pass', async () => {
    const { fetchFn } = lockGraph({ id: 'PAGE1' }, { username: 'filmmyrun' }, json({ error: { message: 'Unsupported get request', code: 100 } }, 400));
    const r = await verifyAccountLock(creds, { fetch: fetchFn });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/^account lock: could not check the accounts \(GET \/IG1: HTTP 400 code 100/);
    const missing = lockGraph({ id: 'PAGE1' }, { name: 'Film My Run' }, { username: 'filmmyrun' });
    expect((await verifyAccountLock(creds, { fetch: missing.fetchFn })).ok).toBe(false);
  });
  it('sameUsername is exact apart from case, spaces and @', () => {
    expect(sameUsername('@FilmMyRun ', 'filmmyrun')).toBe(true);
    expect(sameUsername('filmmyrun2', 'filmmyrun')).toBe(false);
    expect(sameUsername('', '')).toBe(false);
    expect(sameUsername(undefined, 'filmmyrun')).toBe(false);
  });
});

describe('Facebook', () => {
  it('posts the card to the Page with the caption, token in the header only', async () => {
    const { fetchFn, calls } = graph({ 'POST /PAGE1/photos': () => json({ id: '999', post_id: 'PAGE1_555' }) });
    const r = await postToFacebook(creds, 'https://r2.test/social/a.png', 'Caption', { fetch: fetchFn });
    expect(r).toEqual({ ok: true, id: 'PAGE1_555', url: 'https://www.facebook.com/PAGE1_555' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${GRAPH_BASE}/PAGE1/photos`);
    expect(Object.fromEntries(calls[0].body)).toEqual({ url: 'https://r2.test/social/a.png', message: 'Caption', published: 'true' });
    expect(calls[0].auth).toBe('Bearer SECRET-TOKEN-123');
    expect(calls.every((c) => !c.url.includes('SECRET'))).toBe(true);
  });
  it('a Graph error comes back as ok false, never thrown', async () => {
    const { fetchFn } = graph({ 'POST /PAGE1/photos': () => json({ error: { message: 'Invalid OAuth access token', code: 190 } }, 400) });
    const r = await postToFacebook(creds, 'https://r2.test/a.png', 'C', { fetch: fetchFn });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('code 190');
  });
});

describe('Instagram', () => {
  it('container, waits for FINISHED, publishes, then reads the permalink', async () => {
    const { fetchFn, calls } = graph({
      'POST /IG1/media': () => json({ id: 'C1' }),
      'GET /C1': () => [json({ status_code: 'IN_PROGRESS' }), json({ status_code: 'IN_PROGRESS' }), json({ status_code: 'FINISHED' })],
      'POST /IG1/media_publish': () => json({ id: 'M1' }),
      'GET /M1': () => json({ permalink: 'https://www.instagram.com/p/abc/' }),
    });
    const sleep = vi.fn(async () => {});
    const r = await postToInstagram(creds, 'https://r2.test/social/a.png', 'IG caption', { fetch: fetchFn, sleep });
    expect(r).toEqual({ ok: true, id: 'M1', url: 'https://www.instagram.com/p/abc/' });
    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname.replace(/^\/v[\d.]+/, '')}`)).toEqual([
      'POST /IG1/media', 'GET /C1', 'GET /C1', 'GET /C1', 'POST /IG1/media_publish', 'GET /M1',
    ]);
    expect(Object.fromEntries(calls[0].body)).toEqual({ image_url: 'https://r2.test/social/a.png', caption: 'IG caption' });
    expect(calls[4].body.get('creation_id')).toBe('C1');
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(calls.every((c) => c.auth === 'Bearer SECRET-TOKEN-123' && !c.url.includes('SECRET'))).toBe(true);
  });
  it('a container in ERROR is a failure, and nothing is published', async () => {
    const { fetchFn, calls } = graph({
      'POST /IG1/media': () => json({ id: 'C1' }),
      'GET /C1': () => json({ status_code: 'ERROR' }),
    });
    const r = await postToInstagram(creds, 'https://r2.test/a.png', 'C', { fetch: fetchFn, sleep: async () => {} });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('ERROR');
    expect(calls.some((c) => c.url.includes('media_publish'))).toBe(false);
  });
  it('gives up when the container never finishes', async () => {
    const { fetchFn, calls } = graph({ 'POST /IG1/media': () => json({ id: 'C1' }), 'GET /C1': () => json({ status_code: 'IN_PROGRESS' }) });
    const r = await postToInstagram(creds, 'https://r2.test/a.png', 'C', { fetch: fetchFn, sleep: async () => {} });
    expect(r.ok).toBe(false);
    expect(calls.some((c) => c.url.includes('media_publish'))).toBe(false);
  });
  it('a failed permalink lookup still counts as posted', async () => {
    const { fetchFn } = graph({
      'POST /IG1/media': () => json({ id: 'C1' }),
      'GET /C1': () => json({ status_code: 'FINISHED' }),
      'POST /IG1/media_publish': () => json({ id: 'M1' }),
      'GET /M1': () => json({ error: { message: 'nope' } }, 500),
    });
    expect(await postToInstagram(creds, 'https://r2.test/a.png', 'C', { fetch: fetchFn, sleep: async () => {} })).toEqual({ ok: true, id: 'M1', url: undefined });
  });
});
