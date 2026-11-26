import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordSocialSkip, socialCapReached, socialPostForStory, type SocialDeps, type StoryRow } from './post';

const NOW = new Date('2026-11-26T09:00:00Z');
const creds = { pageId: 'PAGE1', igUserId: 'IG1', token: 'SECRET-TOKEN', fbUsernameExpected: 'filmmyrun', igUsernameExpected: 'filmmyrun' };
const story: StoryRow = {
  id: 11, slug: 'walmsley-wins', title: 'Walmsley wins Western States', excerpt: 'A record.', content: '<p>He won.</p>', status: 'published',
  image_url: 'https://r2.test/news/walmsley-wins.webp', photo_credit: 'Photo: Jane / iRunFar', image_source_width: 1600,
  topic: 'trail_ultra', importance: 8, published_at: NOW,
};
const copy = { headline: 'Walmsley wins', highlight: ['Walmsley'], captionFacebook: 'FB text\n\n📷 Photo: Jane / iRunFar', captionInstagram: 'IG text\n\n📷 Photo: Jane / iRunFar', hashtags: ['#WSER'], costUsd: 0.01 };

function fakes(over: Partial<SocialDeps> = {}) {
  const updates: Record<string, unknown>[] = [];
  const d: Partial<SocialDeps> = {
    now: () => NOW,
    loadStory: async () => story,
    verdictTypes: async () => ['news'],
    claim: async () => 7,
    update: async (_id, data) => { updates.push(data); },
    postedSince: async () => 0,
    switchOn: async () => true,
    credentials: () => creds,
    disablePosting: vi.fn(async () => {}),
    copy: vi.fn(async () => copy),
    fetchPhoto: async () => Buffer.from('photo'),
    render: async () => Buffer.from('png'),
    upload: vi.fn(async (key: string) => `https://r2.test/${key}`),
    ...over,
  };
  const last = () => Object.assign({}, ...updates) as Record<string, unknown>;
  return { d, updates, last };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
let fetchSpy: ReturnType<typeof vi.fn>;
const graphCalls = () => fetchSpy.mock.calls.filter(([u]) => String(u).includes('graph.facebook.com'));

/** The real Facebook and Instagram code against a fake Graph API on global fetch. */
function fakeGraph(igFails = false, who: { me?: unknown; page?: unknown; ig?: unknown } = {}) {
  fetchSpy.mockImplementation(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname.replace(/^\/v[\d.]+/, '');
    const m = `${init?.method ?? 'GET'} ${path}`;
    const answer = (v: unknown) => (v instanceof Response ? v : json(v));
    if (m === 'GET /me') return answer(who.me ?? { id: 'PAGE1' });
    if (m === 'GET /PAGE1') return answer(who.page ?? { username: 'filmmyrun', name: 'Film My Run' });
    if (m === 'GET /IG1') return answer(who.ig ?? { username: 'filmmyrun' });
    if (m === 'POST /PAGE1/photos') return json({ id: '1', post_id: 'PAGE1_2' });
    if (m === 'POST /IG1/media') return igFails ? json({ error: { message: 'Media download failed', code: 9004 } }, 400) : json({ id: 'C1' });
    if (m === 'GET /C1') return json({ status_code: 'FINISHED' });
    if (m === 'POST /IG1/media_publish') return json({ id: 'M1' });
    if (m === 'GET /M1') return json({ permalink: 'https://www.instagram.com/p/x/' });
    return json({ error: { message: 'unexpected' } }, 404);
  });
}

beforeEach(() => {
  fetchSpy = vi.fn(async () => json({}));
  vi.stubGlobal('fetch', fetchSpy);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('inert unless the switch is on and Meta is set up', () => {
  it('switch off: no call to Meta; the would-be post is kept as a skip with its card and captions', async () => {
    const { d, last } = fakes({ switchOn: async () => false });
    const r = await socialPostForStory(11, d);
    expect(r).toEqual({ status: 'skipped', reason: 'posting switched off', costUsd: 0.01 });
    expect(graphCalls()).toHaveLength(0);
    expect(last()).toMatchObject({ status: 'skipped', reason: 'posting switched off', headline: 'Walmsley wins', tag: 'RESULTS', card_url: 'https://r2.test/social/walmsley-wins.jpg', caption_instagram: copy.captionInstagram });
  });
  it('credentials missing: no call to Meta', async () => {
    const { d, last } = fakes({ credentials: () => null });
    expect((await socialPostForStory(11, d)).reason).toMatch(/^Meta settings not set/);
    expect(graphCalls()).toHaveLength(0);
    expect(last().status).toBe('skipped');
  });
  it('a card preview that fails to upload does not matter when not posting', async () => {
    const { d, last } = fakes({ switchOn: async () => false, upload: async () => { throw new Error('R2_ACCOUNT_ID is required'); } });
    expect((await socialPostForStory(11, d)).status).toBe('skipped');
    expect(last().card_url).toBeNull();
  });
});

describe('posting', () => {
  it('Facebook then Instagram, both recorded', async () => {
    fakeGraph();
    const { d, last } = fakes();
    const r = await socialPostForStory(11, d);
    expect(r.status).toBe('posted');
    const paths = graphCalls().map(([u, i]) => `${(i as RequestInit)?.method ?? 'GET'} ${new URL(String(u)).pathname.replace(/^\/v[\d.]+/, '')}`);
    expect(paths).toEqual(['GET /me', 'GET /PAGE1', 'GET /IG1', 'POST /PAGE1/photos', 'POST /IG1/media', 'GET /C1', 'POST /IG1/media_publish', 'GET /M1']);
    // Both get the card's public URL; each its own caption.
    const posts = graphCalls().filter(([, i]) => (i as RequestInit)?.method === 'POST');
    const fbBody = new URLSearchParams(String((posts[0][1] as RequestInit).body));
    expect(fbBody.get('url')).toBe('https://r2.test/social/walmsley-wins.jpg');
    expect(fbBody.get('message')).toBe(copy.captionFacebook);
    expect(new URLSearchParams(String((posts[1][1] as RequestInit).body)).get('caption')).toBe(copy.captionInstagram);
    expect(graphCalls().every(([u]) => !String(u).includes('SECRET'))).toBe(true);
    expect(last()).toMatchObject({
      status: 'posted', reason: null, facebook_post_id: 'PAGE1_2', facebook_url: 'https://www.facebook.com/PAGE1_2',
      instagram_media_id: 'M1', instagram_url: 'https://www.instagram.com/p/x/', posted_at: NOW, cost_usd: 0.01,
    });
  });
  it('Facebook can succeed while Instagram fails: partial, with the reason', async () => {
    fakeGraph(true);
    const { d, last } = fakes();
    const r = await socialPostForStory(11, d);
    expect(r.status).toBe('partial');
    expect(r.reason).toMatch(/^Instagram: .*9004/);
    expect(last()).toMatchObject({ status: 'partial', facebook_post_id: 'PAGE1_2', posted_at: NOW });
    expect(last().instagram_media_id).toBeUndefined();
  });
  it('both fail: failed, nothing counted as posted', async () => {
    fakeGraph();
    const lockOk = fetchSpy.getMockImplementation()!;
    fetchSpy.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === 'POST' ? json({ error: { message: 'Invalid OAuth access token', code: 190 } }, 401) : lockOk(url, init));
    const { d, last } = fakes();
    const r = await socialPostForStory(11, d);
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('Facebook:');
    expect(r.reason).toContain('Instagram:');
    expect(last().posted_at).toBeUndefined();
  });
});

describe('the account lock (posts only ever go to Film My Run)', () => {
  const POSTING = (u: unknown, i: unknown) => (i as RequestInit)?.method === 'POST' || /\/(C1|M1)\b/.test(String(u));
  const refused = async (who: Parameters<typeof fakeGraph>[1], reason: RegExp) => {
    fakeGraph(false, who);
    const { d, last } = fakes();
    const r = await socialPostForStory(11, d);
    expect(r.status).toBe('skipped');
    expect(r.reason).toMatch(reason);
    expect(r.reason).toMatch(/; posting switched off$/);
    expect(graphCalls().filter(([u, i]) => POSTING(u, i))).toHaveLength(0); // nothing posted, anywhere
    expect(d.disablePosting).toHaveBeenCalledTimes(1);
    expect(last()).toMatchObject({ status: 'skipped', reason: r.reason, headline: 'Walmsley wins' });
  };
  it('wrong Facebook Page username: refused, switch turned off', () =>
    refused({ page: { username: 'nobleprorunning', name: 'NoblePro' } }, /^account lock: Facebook Page is 'nobleprorunning'/));
  it('wrong Instagram account: refused, switch turned off', () =>
    refused({ ig: { username: 'nobleprorunner' } }, /^account lock: Instagram account is 'nobleprorunner', expected 'filmmyrun'/));
  it('a lookup error: refused, switch turned off', () =>
    refused({ ig: json({ error: { message: 'Unsupported get request', code: 100 } }, 400) }, /^account lock: could not check the accounts/));
  it('a token that is not the Page token (/me is someone else): refused, switch turned off', () =>
    refused({ me: { id: 'USER9' } }, /^account lock: the token is not the Film My Run Page token/));
  it('a different case still matches, and posting goes ahead', async () => {
    fakeGraph(false, { page: { username: 'FilmMyRun' }, ig: { username: 'FILMMYRUN' } });
    const { d } = fakes();
    expect((await socialPostForStory(11, d)).status).toBe('posted');
    expect(d.disablePosting).not.toHaveBeenCalled();
  });
  it('expected usernames missing: inert, Meta never called', async () => {
    const { metaCredentials } = await import('./meta');
    const env = { META_FB_PAGE_ID: 'PAGE1', META_IG_USER_ID: 'IG1', META_FB_PAGE_ACCESS_TOKEN: 'SECRET-TOKEN', META_FB_PAGE_USERNAME_EXPECTED: '', META_IG_USERNAME_EXPECTED: 'filmmyrun' };
    const { d } = fakes({ credentials: () => metaCredentials(env) });
    const r = await socialPostForStory(11, d);
    expect(r).toMatchObject({ status: 'skipped', reason: expect.stringMatching(/^Meta settings not set/) });
    expect(graphCalls()).toHaveLength(0);
  });
  it('the lock runs before every post, not once per run', async () => {
    fakeGraph();
    const { d } = fakes();
    await socialPostForStory(11, d);
    await socialPostForStory(12, d);
    expect(graphCalls().filter(([u]) => /\/me\?/.test(String(u)))).toHaveLength(2);
  });
});

describe('the rules', () => {
  it('no usable photo: skipped before any AI call', async () => {
    for (const [s, why] of [
      [{ ...story, photo_credit: null, image_source_width: null }, 'branded fallback'],
      [{ ...story, image_source_width: 900 }, 'photo too small'],
      [{ ...story, image_url: null }, 'no photo'],
    ] as const) {
      const { d } = fakes({ loadStory: async () => s });
      const r = await socialPostForStory(11, d);
      expect(r.status).toBe('skipped');
      expect(r.reason).toContain(why);
      expect(d.copy).not.toHaveBeenCalled();
    }
  });
  it('the daily cap counts from London midnight and skips a second post the same day', async () => {
    let since: Date | null = null;
    const { d } = fakes({ now: () => new Date('2026-07-01T23:30:00Z'), postedSince: async (s) => { since = s; return 1; } });
    const r = await socialPostForStory(11, d);
    expect(r).toMatchObject({ status: 'skipped', reason: 'daily cap reached' });
    expect(since!.toISOString()).toBe('2026-07-01T23:00:00.000Z');
    expect(d.copy).not.toHaveBeenCalled();
  });
  it('the first post of the day goes ahead', async () => {
    const { d } = fakes({ postedSince: async () => 0, switchOn: async () => false });
    expect((await socialPostForStory(11, d)).reason).toBe('posting switched off'); // past the cap, as far as it can go when off
    expect(d.copy).toHaveBeenCalledTimes(1);
  });
  it("socialCapReached: true once today's post is out", async () => {
    expect(await socialCapReached(fakes({ postedSince: async () => 0 }).d)).toBe(false);
    expect(await socialCapReached(fakes({ postedSince: async () => 1 }).d)).toBe(true);
  });
  it('never twice: a story that already has a row is left alone', async () => {
    const { d, updates } = fakes({ claim: async () => null });
    const r = await socialPostForStory(11, d);
    expect(r.status).toBe('skipped');
    expect(updates).toHaveLength(0);
    expect(d.copy).not.toHaveBeenCalled();
  });
  it('an unpublished story is not posted', async () => {
    const { d } = fakes({ loadStory: async () => ({ ...story, status: 'held' }) });
    expect((await socialPostForStory(11, d)).status).toBe('skipped');
  });
});

describe('never throws', () => {
  it('an error part way is recorded as failed and returned, not thrown', async () => {
    const { d, last } = fakes({ copy: async () => { throw new Error('social: every provider failed'); } });
    const r = await socialPostForStory(11, d);
    expect(r).toMatchObject({ status: 'failed', reason: 'error: social: every provider failed' });
    expect(last()).toMatchObject({ status: 'failed', reason: 'error: social: every provider failed' });
  });
  it('even when the database is down', async () => {
    const { d } = fakes({ loadStory: async () => { throw new Error('connect ECONNREFUSED'); } });
    await expect(socialPostForStory(11, d)).resolves.toMatchObject({ status: 'failed' });
    const { d: d2 } = fakes({ render: async () => { throw new Error('bad photo'); }, update: async () => { throw new Error('db gone'); } });
    await expect(socialPostForStory(11, d2)).resolves.toMatchObject({ status: 'failed', reason: 'error: bad photo' });
  });
});

describe('recordSocialSkip (a run story that is not posted)', () => {
  it('records a skipped row with the reason, at no cost and with no AI call or upload', async () => {
    const { d, last } = fakes();
    const r = await recordSocialSkip({ id: 11, slug: 'walmsley-wins' }, 'not chosen today', d);
    expect(r).toEqual({ status: 'skipped', reason: 'not chosen today', costUsd: 0 });
    expect(last()).toMatchObject({ status: 'skipped', reason: 'not chosen today', cost_usd: 0 });
    expect(d.copy).not.toHaveBeenCalled();
    expect(d.upload).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('a story that already has a row is left alone', async () => {
    const { d, updates } = fakes({ claim: async () => null });
    expect((await recordSocialSkip({ id: 11, slug: 'walmsley-wins' }, 'not chosen today', d)).status).toBe('skipped');
    expect(updates).toHaveLength(0);
  });
  it('never throws', async () => {
    const { d } = fakes({ claim: async () => { throw new Error('db gone'); } });
    await expect(recordSocialSkip({ id: 11, slug: 'x' }, 'no photo', d)).resolves.toMatchObject({ status: 'failed', reason: 'error: db gone' });
  });
});
