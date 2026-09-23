import { encodeTestJws } from '@/lib/chat/pro';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashCode } from './codes';
import { handleApple, handleDelete, handleMe, handlePro, handleRequestCode, handleSignOut, handleVerify, memberFromBearer, resetMemberLimits, type Member, type MemberDeps } from './handlers';

const NOW = Date.UTC(2026, 8, 21, 9, 0, 0);

function fakeDeps() {
  const codes = new Map<string, { hash: string; expires: Date }[]>();
  const users = new Map<string, Member>();
  const sessions = new Map<string, { userId: number; expires: Date }>();
  const attached: [number, string][] = [];
  const sent: [string, string][] = [];
  let nextId = 1;
  const deps: MemberDeps = {
    saveCode: async (email, hash, expires) => { codes.set(email, [...(codes.get(email) ?? []), { hash, expires }]); },
    codeHashes: async (email, now) => (codes.get(email) ?? []).filter((c) => c.expires > now).map((c) => c.hash),
    deleteCodes: async (email) => { codes.delete(email); },
    findOrCreateUser: async (email) => {
      let u = users.get(email);
      if (!u) { u = { id: nextId++, email, name: null, proUntil: null }; users.set(email, u); }
      return u;
    },
    createSession: async (userId, token, expires) => { sessions.set(token, { userId, expires }); },
    memberForToken: async (token, now) => {
      const s = sessions.get(token);
      if (!s || s.expires <= now) return null;
      return [...users.values()].find((u) => u.id === s.userId) ?? null;
    },
    deleteSession: async (token) => { sessions.delete(token); },
    attachGuestOrders: async (userId, email) => { attached.push([userId, email]); },
    setPro: async (userId, until) => {
      const u = [...users.values()].find((x) => x.id === userId)!;
      if (!u.proUntil || new Date(u.proUntil) < until) u.proUntil = until.toISOString();
      return u;
    },
    sendCode: async (email, code) => { sent.push([email, code]); },
    now: () => NOW,
  };
  return { deps, codes, users, sessions, attached, sent };
}

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`https://filmmyrun.com/api/app/v1/auth/${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });
const get = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(`https://filmmyrun.com/api/app/v1/auth/${path}`, { headers });

async function signIn(f: ReturnType<typeof fakeDeps>, email = 'runner@example.com') {
  await handleRequestCode(post('code', { email }), f.deps);
  const code = f.sent.at(-1)![1];
  const res = await handleVerify(post('verify', { email, code }), f.deps);
  return (await res.json()) as { token: string; member: Member };
}

beforeEach(() => resetMemberLimits());

describe('handleRequestCode', () => {
  it('normalises, stores a hash, emails the code, answers ok', async () => {
    const f = fakeDeps();
    const res = await handleRequestCode(post('code', { email: ' Runner@Example.com ' }), f.deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(f.sent).toHaveLength(1);
    const [to, code] = f.sent[0];
    expect(to).toBe('runner@example.com');
    expect(code).toMatch(/^\d{6}$/);
    expect(f.codes.get('runner@example.com')![0].hash).toBe(hashCode('runner@example.com', code));
    expect(f.codes.get('runner@example.com')![0].expires.getTime()).toBe(NOW + 600_000);
  });

  it('rejects a bad email with 400', async () => {
    const f = fakeDeps();
    const res = await handleRequestCode(post('code', { email: 'nope' }), f.deps);
    expect(res.status).toBe(400);
    expect(f.sent).toHaveLength(0);
  });

  it('limits to five codes an hour per email', async () => {
    const f = fakeDeps();
    for (let i = 0; i < 5; i++) expect((await handleRequestCode(post('code', { email: 'a@b.co' }), f.deps)).status).toBe(200);
    const sixth = await handleRequestCode(post('code', { email: 'a@b.co' }), f.deps);
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(f.sent).toHaveLength(5);
  });

  it('answers 503 when the email cannot be sent', async () => {
    const f = fakeDeps();
    f.deps.sendCode = async () => { throw new Error('resend down'); };
    const res = await handleRequestCode(post('code', { email: 'a@b.co' }), f.deps);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'email_unavailable' });
  });
});

describe('handleVerify', () => {
  it('signs in with the right code, creates the user, attaches guest orders, issues a token', async () => {
    const f = fakeDeps();
    const { token, member } = await signIn(f);
    expect(member).toEqual({ id: 1, email: 'runner@example.com', name: null, proUntil: null });
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(f.sessions.get(token)!.expires.getTime()).toBe(NOW + 365 * 86_400_000);
    expect(f.attached).toEqual([[1, 'runner@example.com']]);
    expect(f.codes.has('runner@example.com')).toBe(false);
  });

  it('is case-insensitive on the email', async () => {
    const f = fakeDeps();
    await handleRequestCode(post('code', { email: 'a@b.co' }), f.deps);
    const code = f.sent[0][1];
    const res = await handleVerify(post('verify', { email: 'A@B.CO', code }), f.deps);
    expect(res.status).toBe(200);
  });

  it('answers 401 wrong_code, then 410 expired on the fifth wrong answer', async () => {
    const f = fakeDeps();
    await handleRequestCode(post('code', { email: 'a@b.co' }), f.deps);
    for (let i = 0; i < 4; i++) {
      const r = await handleVerify(post('verify', { email: 'a@b.co', code: '000000' }), f.deps);
      expect(r.status).toBe(401);
      expect(await r.json()).toEqual({ ok: false, error: 'wrong_code' });
    }
    const fifth = await handleVerify(post('verify', { email: 'a@b.co', code: '000000' }), f.deps);
    expect(fifth.status).toBe(410);
    expect(await fifth.json()).toEqual({ ok: false, error: 'expired' });
    expect(f.codes.has('a@b.co')).toBe(false);
    // Even the right code is dead now.
    const right = await handleVerify(post('verify', { email: 'a@b.co', code: f.sent[0][1] }), f.deps);
    expect(right.status).toBe(410);
  });

  it('answers 410 for an expired code', async () => {
    const f = fakeDeps();
    await handleRequestCode(post('code', { email: 'a@b.co' }), f.deps);
    f.deps.now = () => NOW + 600_001;
    const res = await handleVerify(post('verify', { email: 'a@b.co', code: f.sent[0][1] }), f.deps);
    expect(res.status).toBe(410);
  });

  it('answers 400 for a malformed body', async () => {
    const f = fakeDeps();
    expect((await handleVerify(post('verify', { email: 'a@b.co' }), f.deps)).status).toBe(400);
    expect((await handleVerify(post('verify', { email: 'a@b.co', code: '12' }), f.deps)).status).toBe(400);
  });
});

describe('handleMe and handleSignOut', () => {
  it('returns the member for a live token and 401 otherwise', async () => {
    const f = fakeDeps();
    const { token } = await signIn(f);
    const ok = await handleMe(get('me', { authorization: `Bearer ${token}` }), f.deps);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, member: { id: 1, email: 'runner@example.com', name: null, proUntil: null } });
    expect((await handleMe(get('me'), f.deps)).status).toBe(401);
    expect((await handleMe(get('me', { authorization: 'Bearer nope' }), f.deps)).status).toBe(401);
    f.deps.now = () => NOW + 366 * 86_400_000;
    expect((await handleMe(get('me', { authorization: `Bearer ${token}` }), f.deps)).status).toBe(401);
  });

  it('sign-out deletes only that session', async () => {
    const f = fakeDeps();
    const a = await signIn(f);
    const b = await signIn(f);
    const res = await handleSignOut(post('signout', {}, { authorization: `Bearer ${a.token}` }), f.deps);
    expect(res.status).toBe(200);
    expect(f.sessions.has(a.token)).toBe(false);
    expect(f.sessions.has(b.token)).toBe(true);
    expect((await handleSignOut(post('signout', {}), f.deps)).status).toBe(200);
  });
});

describe('memberFromBearer', () => {
  it('reads the header and tolerates its absence', async () => {
    const f = fakeDeps();
    const { token } = await signIn(f);
    expect(await memberFromBearer(new Request('https://x', { headers: { authorization: `Bearer ${token}` } }), f.deps)).toEqual({ id: 1, email: 'runner@example.com', name: null, proUntil: null });
    expect(await memberFromBearer(new Request('https://x'), f.deps)).toBeNull();
    expect(await memberFromBearer(new Request('https://x', { headers: { authorization: 'Basic abc' } }), f.deps)).toBeNull();
  });
});

describe('handlePro', () => {
  const install = '11111111-1111-1111-1111-111111111111';
  const proof = encodeTestJws({ bundleId: 'com.filmmyrun.app', productId: 'com.filmmyrun.app.pro.annual', expiresDate: NOW + 86_400_000 });

  it('stamps the account Pro until the transaction expires', async () => {
    const f = fakeDeps();
    const { token } = await signIn(f);
    const r = await handlePro(post('pro', {}, { authorization: `Bearer ${token}`, 'X-FMR-Install': install, 'X-FMR-Pro': proof }), f.deps);
    expect(r.status).toBe(200);
    expect((await r.json()).member.proUntil).toBe(new Date(NOW + 86_400_000).toISOString());
    // A shorter proof later never shortens it.
    const shorter = encodeTestJws({ bundleId: 'com.filmmyrun.app', productId: 'com.filmmyrun.app.pro.monthly', expiresDate: NOW + 3_600_000 });
    const r2 = await handlePro(post('pro', {}, { authorization: `Bearer ${token}`, 'X-FMR-Install': install, 'X-FMR-Pro': shorter }), f.deps);
    expect((await r2.json()).member.proUntil).toBe(new Date(NOW + 86_400_000).toISOString());
  });

  it('refuses without a session, a valid install id or a good proof', async () => {
    const f = fakeDeps();
    const { token } = await signIn(f);
    expect((await handlePro(post('pro', {}, { 'X-FMR-Install': install, 'X-FMR-Pro': proof }), f.deps)).status).toBe(401);
    expect((await handlePro(post('pro', {}, { authorization: `Bearer ${token}`, 'X-FMR-Pro': proof }), f.deps)).status).toBe(400);
    expect((await handlePro(post('pro', {}, { authorization: `Bearer ${token}`, 'X-FMR-Install': install, 'X-FMR-Pro': 'nope' }), f.deps)).status).toBe(403);
    expect(f.users.get('runner@example.com')?.proUntil).toBeNull();
  });
});

describe('handleApple', () => {
  function withApple(f: ReturnType<typeof fakeDeps>) {
    const links = new Map<string, number>();
    f.deps.verifyApple = async (t) => (t === 'good' ? { sub: 'apple-1', email: 'Relay@PrivateRelay.AppleID.com' } : t === 'jo' ? { sub: 'apple-jo', email: 'runner@example.com' } : null);
    f.deps.memberForApple = async (sub) => { const id = links.get(sub); return id ? [...f.users.values()].find((u) => u.id === id) ?? null : null; };
    f.deps.linkApple = async (userId, sub, name) => {
      links.set(sub, userId);
      const u = [...f.users.values()].find((x) => x.id === userId)!;
      if (name && !u.name) u.name = name;
    };
    return links;
  }

  it('401s a token Apple does not vouch for, and 400s a missing one', async () => {
    const f = fakeDeps(); withApple(f);
    expect((await handleApple(post('apple', { identityToken: 'forged' }), f.deps)).status).toBe(401);
    expect((await handleApple(post('apple', {}), f.deps)).status).toBe(400);
  });

  it('creates an account on the shared email, links the Apple id, and returns a session', async () => {
    const f = fakeDeps(); const links = withApple(f);
    const res = await handleApple(post('apple', { identityToken: 'good', name: 'Sam Runner' }), f.deps);
    const body = (await res.json()) as { token: string; member: Member };
    expect(res.status).toBe(200);
    expect(body.member.email).toBe('relay@privaterelay.appleid.com');
    expect(body.member.name).toBe('Sam Runner');
    expect(links.get('apple-1')).toBe(body.member.id);
    expect(await handleMe(get('me', { Authorization: `Bearer ${body.token}` }), f.deps).then((r) => r.status)).toBe(200);
  });

  it('finds the email-code account by the email Apple shares, so one runner has one account', async () => {
    const f = fakeDeps(); withApple(f);
    const first = await signIn(f);
    const body = (await (await handleApple(post('apple', { identityToken: 'jo' }), f.deps)).json()) as { member: Member };
    expect(body.member.id).toBe(first.member.id);
  });

  it('links to the signed-in member when Apple hides the email, and comes back to it next time', async () => {
    const f = fakeDeps(); const links = withApple(f);
    const me = await signIn(f);
    await handleApple(post('apple', { identityToken: 'good' }, { Authorization: `Bearer ${me.token}` }), f.deps);
    expect(links.get('apple-1')).toBe(me.member.id);
    const again = (await (await handleApple(post('apple', { identityToken: 'good' }), f.deps)).json()) as { member: Member };
    expect(again.member.id).toBe(me.member.id);
  });

  it('503s when the server has no Apple support wired', async () => {
    const f = fakeDeps();
    expect((await handleApple(post('apple', { identityToken: 'good' }), f.deps)).status).toBe(503);
  });
});

describe('handleDelete', () => {
  it('deletes the bearer\'s account and nobody else\'s; a signed-out call is 401', async () => {
    const f = fakeDeps();
    const deleted: number[] = [];
    f.deps.deleteAccount = async (id) => { deleted.push(id); };
    expect((await handleDelete(post('delete', {}), f.deps)).status).toBe(401);
    const me = await signIn(f);
    const res = await handleDelete(post('delete', {}, { Authorization: `Bearer ${me.token}` }), f.deps);
    expect(res.status).toBe(200);
    expect(deleted).toEqual([me.member.id]);
  });

  it('says so when the deletion fails, rather than claiming it worked', async () => {
    const f = fakeDeps();
    f.deps.deleteAccount = async () => { throw new Error('db down'); };
    const me = await signIn(f);
    expect((await handleDelete(post('delete', {}, { Authorization: `Bearer ${me.token}` }), f.deps)).status).toBe(500);
  });
});
