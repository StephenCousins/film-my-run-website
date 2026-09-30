import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { memoryStore, subscribe, subscribeAfterPayment, unsubscribe, unsubscribeByToken, isSubscribed, SOURCES, type Subscriber } from './consent';
import { handleApple, handleRequestCode, handleVerify, resetMemberLimits, type Member, type MemberDeps } from '@/lib/members/handlers';
import { handleGetNewsletter, handlePostNewsletter, type MemberNewsletterDeps } from './member';

const T0 = new Date('2026-09-30T09:00:00Z');
const T1 = new Date('2026-10-01T09:00:00Z');

const unsubscribed = (email: string): Subscriber => ({
  email,
  status: 'unsubscribed',
  token: 'tok-' + email,
  basis: 'consent',
  source: 'signup-web',
  consented_at: T0,
  unsubscribed_at: T0,
});

describe('subscribe', () => {
  it('creates an active subscriber with its basis, source and time', async () => {
    const s = memoryStore();
    expect(await subscribe(s, ' Jo@Example.com ', 'consent', 'signup-web', T0)).toBe('created');
    expect(s.rows[0]).toMatchObject({ email: 'jo@example.com', status: 'active', basis: 'consent', source: 'signup-web', consented_at: T0 });
    expect(s.rows[0].token).toMatch(/[0-9a-f-]{36}/);
  });

  it('NEVER resubscribes someone who unsubscribed on a soft opt-in (a pre-ticked box)', async () => {
    const s = memoryStore([unsubscribed('jo@example.com')]);
    for (const source of ['checkout', 'club'] as const) {
      expect(await subscribe(s, 'jo@example.com', 'soft-opt-in', source, T1)).toBe('kept-unsubscribed');
    }
    expect(s.rows[0]).toMatchObject({ status: 'unsubscribed', unsubscribed_at: T0, consented_at: T0 });
    expect(await subscribeAfterPayment(s, { email: 'jo@example.com', paid: true, optedIn: true, source: 'checkout' }, T1)).toBe('kept-unsubscribed');
    expect(s.rows[0].status).toBe('unsubscribed');
  });

  it('resubscribes someone who unsubscribed only when they actively consent now', async () => {
    const s = memoryStore([unsubscribed('jo@example.com')]);
    expect(await subscribe(s, 'jo@example.com', 'consent', 'prompt', T1)).toBe('resubscribed');
    expect(s.rows[0]).toMatchObject({ status: 'active', basis: 'consent', source: 'prompt', consented_at: T1, unsubscribed_at: null });
    expect(s.rows[0].token).toBe('tok-jo@example.com'); // old unsubscribe links keep working
  });

  it('an active subscriber stays; consent replaces a soft opt-in record, never the other way', async () => {
    const s = memoryStore();
    await subscribe(s, 'jo@example.com', 'soft-opt-in', 'checkout', T0);
    expect(await subscribe(s, 'jo@example.com', 'soft-opt-in', 'club', T1)).toBe('already');
    expect(s.rows[0]).toMatchObject({ basis: 'soft-opt-in', source: 'checkout', consented_at: T0 });
    expect(await subscribe(s, 'jo@example.com', 'consent', 'prompt', T1)).toBe('already');
    expect(s.rows[0]).toMatchObject({ basis: 'consent', source: 'prompt', consented_at: T1 });
    await subscribe(s, 'jo@example.com', 'soft-opt-in', 'checkout', T1);
    expect(s.rows[0].basis).toBe('consent');
    expect(s.rows).toHaveLength(1);
  });

  it('refuses junk', async () => {
    expect(await subscribe(memoryStore(), 'not an email', 'consent', 'prompt')).toBe('bad-email');
  });
});

describe('subscribeAfterPayment (shop checkout and FMR Club webhooks)', () => {
  it('subscribes as soft opt-in only when paid AND the box stayed ticked', async () => {
    const s = memoryStore();
    expect(await subscribeAfterPayment(s, { email: 'a@x.com', paid: false, optedIn: true, source: 'checkout' })).toBe('skipped');
    expect(await subscribeAfterPayment(s, { email: 'a@x.com', paid: true, optedIn: false, source: 'checkout' })).toBe('skipped');
    expect(await subscribeAfterPayment(s, { email: null, paid: true, optedIn: true, source: 'club' })).toBe('skipped');
    expect(s.rows).toHaveLength(0);
    expect(await subscribeAfterPayment(s, { email: 'a@x.com', paid: true, optedIn: true, source: 'club' }, T0)).toBe('created');
    expect(s.rows[0]).toMatchObject({ basis: 'soft-opt-in', source: 'club', status: 'active' });
  });

  it('never throws: a sale must not fail over the newsletter', async () => {
    const s = memoryStore();
    s.create = async () => {
      throw new Error('db down');
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await subscribeAfterPayment(s, { email: 'a@x.com', paid: true, optedIn: true, source: 'checkout' })).toBe('failed');
  });
});

describe('one-click unsubscribe works for a subscriber made each new way', () => {
  it.each(SOURCES)('%s', async (source) => {
    const s = memoryStore();
    await subscribe(s, `${source}@x.com`, source === 'checkout' || source === 'club' ? 'soft-opt-in' : 'consent', source, T0);
    const token = s.rows[0].token;
    expect(await unsubscribeByToken(s, token, T1)).toBe('done');
    expect(s.rows[0]).toMatchObject({ status: 'unsubscribed', unsubscribed_at: T1 });
    expect(await unsubscribeByToken(s, token, T1)).toBe('already');
    expect(await isSubscribed(s, `${source}@x.com`)).toBe(false);
    // …and a later pre-ticked box does not bring them back.
    expect(await subscribe(s, `${source}@x.com`, 'soft-opt-in', 'checkout')).toBe('kept-unsubscribed');
  });

  it('unknown tokens are refused', async () => {
    expect(await unsubscribeByToken(memoryStore(), 'nope')).toBe('unknown');
    expect(await unsubscribeByToken(memoryStore(), '')).toBe('unknown');
  });
});

describe('sign-in newsletter box (email code and Sign in with Apple)', () => {
  beforeEach(() => resetMemberLimits());

  function deps() {
    const users = new Map<string, Member>();
    const sent: string[] = [];
    const subscribed: [string, string][] = [];
    let n = 1;
    const d: MemberDeps = {
      saveCode: async () => {},
      codeHashes: async (email) => [(await import('@/lib/members/codes')).hashCode(email, sent.at(-1)!)],
      deleteCodes: async () => {},
      findOrCreateUser: async (email) => {
        let u = users.get(email);
        if (!u) users.set(email, (u = { id: n++, email, name: null, proUntil: null }));
        return u;
      },
      createSession: async () => {},
      memberForToken: async () => null,
      deleteSession: async () => {},
      attachGuestOrders: async () => {},
      setPro: async () => ({}) as Member,
      sendCode: async (_e, code) => void sent.push(code),
      verifyApple: async () => ({ sub: 'apple-1', email: 'apple@example.com' }),
      memberForApple: async () => null,
      linkApple: async () => {},
      subscribeNewsletter: async (email, source) => void subscribed.push([email, source]),
    };
    return { d, sent, subscribed };
  }
  const post = (body: unknown) =>
    new NextRequest('https://filmmyrun.com/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  const verify = async (f: ReturnType<typeof deps>, extra: object) => {
    await handleRequestCode(post({ email: 'jo@example.com' }), f.d);
    return handleVerify(post({ email: 'jo@example.com', code: f.sent.at(-1), ...extra }), f.d);
  };

  it('ticked on the website: consent, source signup-web', async () => {
    const f = deps();
    expect((await verify(f, { newsletter: true, source: 'web' })).status).toBe(200);
    expect(f.subscribed).toEqual([['jo@example.com', 'signup-web']]);
  });
  it('ticked in the app: signup-app', async () => {
    const f = deps();
    await verify(f, { newsletter: true });
    expect(f.subscribed).toEqual([['jo@example.com', 'signup-app']]);
  });
  it('unticked or missing: nothing', async () => {
    const f = deps();
    await verify(f, { newsletter: false });
    await verify(f, {});
    await verify(f, { newsletter: 'yes' });
    expect(f.subscribed).toEqual([]);
  });
  it('Sign in with Apple with the box ticked', async () => {
    const f = deps();
    expect((await handleApple(post({ identityToken: 'x', newsletter: true }), f.d)).status).toBe(200);
    expect(f.subscribed).toEqual([['apple@example.com', 'signup-app']]);
  });
  it('a newsletter failure never fails the sign-in', async () => {
    const f = deps();
    f.d.subscribeNewsletter = async () => {
      throw new Error('db down');
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await verify(f, { newsletter: true })).status).toBe(200);
  });
});

describe('/api/members/newsletter', () => {
  function deps(member: Member | null) {
    const store = memoryStore();
    let asked: Date | null = null;
    const d: MemberNewsletterDeps = {
      member: async () => member,
      isSubscribed: (e) => isSubscribed(store, e),
      askedAt: async () => asked,
      setAsked: async (_id, at) => void (asked = at),
      subscribe: (e) => subscribe(store, e, 'consent', 'prompt'),
      unsubscribe: (e) => unsubscribe(store, e),
      now: () => T1,
    };
    return { d, store };
  }
  const jo: Member = { id: 1, email: 'jo@example.com', name: null, proUntil: null };
  const req = (body?: unknown) =>
    new Request('https://filmmyrun.com/api/members/newsletter', body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) });

  it('401 when signed out', async () => {
    expect((await handleGetNewsletter(req(), deps(null).d)).status).toBe(401);
    expect((await handlePostNewsletter(req({ subscribe: true }), deps(null).d)).status).toBe(401);
  });
  it('GET: not subscribed, not asked; Yes: subscribed with consent from the prompt, asked', async () => {
    const f = deps(jo);
    expect(await (await handleGetNewsletter(req(), f.d)).json()).toEqual({ ok: true, subscribed: false, asked: false });
    expect(await (await handlePostNewsletter(req({ subscribe: true }), f.d)).json()).toEqual({ ok: true, subscribed: true, asked: true });
    expect(f.store.rows[0]).toMatchObject({ basis: 'consent', source: 'prompt', status: 'active' });
    expect(await (await handleGetNewsletter(req(), f.d)).json()).toEqual({ ok: true, subscribed: true, asked: true });
  });
  it('No: asked, not subscribed, and a later toggle off unsubscribes', async () => {
    const f = deps(jo);
    expect(await (await handlePostNewsletter(req({ subscribe: false }), f.d)).json()).toEqual({ ok: true, subscribed: false, asked: true });
    await handlePostNewsletter(req({ subscribe: true }), f.d);
    await handlePostNewsletter(req({ subscribe: false }), f.d);
    expect(f.store.rows[0].status).toBe('unsubscribed');
  });
  it('400 without a boolean', async () => {
    expect((await handlePostNewsletter(req({ subscribe: 'yes' }), deps(jo).d)).status).toBe(400);
  });
});
