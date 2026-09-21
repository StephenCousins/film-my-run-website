# Membership (website half) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email-code sign-in, a 10% member coupon at checkout, and a member orders API and page on filmmyrun.com, so the iPhone app can share the same account.

**Architecture:** Thin Next.js route files call handler functions in `src/lib/members/` that take injected deps (the `src/lib/chat/handlers.ts` pattern), so every rule is unit-tested with fakes and Prisma is touched only in `store.ts`. Identity is the existing `users` table; codes go in the unused `verification_tokens` table (hashed); bearer tokens go in the unused `sessions` table. The website's own pages sign the NextAuth session in through a second `CredentialsProvider` (`id: 'code'`) that accepts a freshly issued bearer token.

**Tech Stack:** Next.js 15 app router, next-auth 4, Prisma (Postgres on Railway), Stripe 14, Resend, vitest 3.

**Spec:** `../filmmyrun-ios/docs/superpowers/specs/2026-09-21-membership-design.md` (the spec lives in the iOS repo; sections cited below are its sections).

## Global Constraints

- A push to `main` deploys to Railway. `npm test` and `npm run typecheck` must be green before every commit that will be pushed; check the live site after each push.
- Migrations are applied by hand: `DATABASE_URL="$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL)" npx prisma migrate deploy`. Never write the URL to disk.
- Never commit secrets. The Stripe coupon id goes in Railway as `STRIPE_MEMBER_COUPON`.
- The Stripe account is the one whose keys are already in this site's Railway env (never the ClubRoute account).
- Copy is British English, sentence case: "Sign in", "member", "Email me a code".
- `auth/code` answers `{ ok: true }` for unknown emails too (no account enumeration). Codes are stored hashed; 10-minute expiry; 5 wrong answers kill the code; 5 code requests per email per hour.
- Bearer tokens: 32 random bytes base64url, 365-day expiry, one `sessions` row per sign-in.
- Order status values are the ones the column already carries: `pending | paid | submitted | shipped`. Pending is never returned to a member.
- Commit messages end with the Co-Authored-By and Claude-Session lines this session uses.

---

### Task 1: `orders.tracking_url` migration

**Files:**
- Modify: `prisma/schema.prisma` (model `orders`, after `contrado_order_id`)
- Create: `prisma/migrations/20260921090000_orders_tracking_url/migration.sql`

**Interfaces:**
- Produces: `orders.tracking_url: string | null` on the Prisma client, used by Tasks 6 and 7.

- [ ] **Step 1: Add the column to the schema**

In `prisma/schema.prisma`, inside `model orders`, after the `contrado_order_id String?` line add:

```prisma
  tracking_url      String?
```

- [ ] **Step 2: Write the migration**

`prisma/migrations/20260921090000_orders_tracking_url/migration.sql`:

```sql
ALTER TABLE "orders" ADD COLUMN "tracking_url" TEXT;
```

- [ ] **Step 3: Regenerate the client and typecheck**

Run: `npx prisma generate && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260921090000_orders_tracking_url
git commit -m "Members: orders.tracking_url column"
```

(The migration is deployed in Task 11, with the push.)

---

### Task 2: Code and token helpers

**Files:**
- Create: `src/lib/members/codes.ts`
- Test: `src/lib/members/codes.test.ts`

**Interfaces:**
- Produces:
  - `normaliseEmail(raw: unknown): string | null` — trimmed, lower-cased, `null` unless it looks like `a@b.c` and is ≤ 254 chars.
  - `makeCode(): string` — six digits, CSPRNG, may start with 0.
  - `hashCode(email: string, code: string): string` — sha256 hex of `${email}:${code}`.
  - `makeToken(): string` — 32 random bytes, base64url, no padding.
  - `CODE_TTL_MS = 600_000`, `TOKEN_TTL_MS = 365 * 86_400_000`, `MAX_CODE_ATTEMPTS = 5`, `CODES_PER_HOUR = 5`.

- [ ] **Step 1: Write the failing tests**

`src/lib/members/codes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hashCode, makeCode, makeToken, normaliseEmail } from './codes';

describe('normaliseEmail', () => {
  it('trims and lower-cases', () => {
    expect(normaliseEmail('  Stephen@FilmMyRun.com ')).toBe('stephen@filmmyrun.com');
  });
  it('rejects junk', () => {
    expect(normaliseEmail('')).toBeNull();
    expect(normaliseEmail('not an email')).toBeNull();
    expect(normaliseEmail(42)).toBeNull();
    expect(normaliseEmail('a@' + 'b'.repeat(260) + '.com')).toBeNull();
  });
});

describe('makeCode', () => {
  it('is six digits', () => {
    for (let i = 0; i < 50; i++) expect(makeCode()).toMatch(/^\d{6}$/);
  });
});

describe('hashCode', () => {
  it('is stable and bound to the email', () => {
    expect(hashCode('a@b.co', '123456')).toBe(hashCode('a@b.co', '123456'));
    expect(hashCode('a@b.co', '123456')).not.toBe(hashCode('x@b.co', '123456'));
    expect(hashCode('a@b.co', '123456')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('makeToken', () => {
  it('is 43 base64url chars and unique', () => {
    const a = makeToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(makeToken()).not.toBe(a);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/members/codes.test.ts`
Expected: FAIL, "Failed to resolve import './codes'".

- [ ] **Step 3: Implement**

`src/lib/members/codes.ts`:

```ts
/** Email-code sign-in primitives (spec §2). Pure; no I/O. */
import { createHash, randomBytes, randomInt } from 'crypto';

export const CODE_TTL_MS = 10 * 60_000;
export const TOKEN_TTL_MS = 365 * 86_400_000;
export const MAX_CODE_ATTEMPTS = 5;
export const CODES_PER_HOUR = 5;

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export const makeCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const hashCode = (email: string, code: string) =>
  createHash('sha256').update(`${email}:${code}`).digest('hex');

export const makeToken = () => randomBytes(32).toString('base64url');
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/members/codes.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/members/codes.ts src/lib/members/codes.test.ts
git commit -m "Members: code and token helpers"
```

---

### Task 3: Auth handlers with injected store

**Files:**
- Create: `src/lib/members/handlers.ts`
- Test: `src/lib/members/handlers.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Member = { id: number; email: string; name: string | null };
  export type MemberDeps = {
    saveCode: (email: string, hash: string, expires: Date) => Promise<void>;
    /** Every unexpired hash for the email. */
    codeHashes: (email: string, now: Date) => Promise<string[]>;
    deleteCodes: (email: string) => Promise<void>;
    findOrCreateUser: (email: string, now: Date) => Promise<Member>;
    createSession: (userId: number, token: string, expires: Date) => Promise<void>;
    /** Member for an unexpired token, else null. */
    memberForToken: (token: string, now: Date) => Promise<Member | null>;
    deleteSession: (token: string) => Promise<void>;
    attachGuestOrders: (userId: number, email: string) => Promise<void>;
    sendCode: (email: string, code: string) => Promise<void>;
    now?: () => number;
  };
  export function handleRequestCode(req: NextRequest, deps: MemberDeps): Promise<Response>;
  export function handleVerify(req: NextRequest, deps: MemberDeps): Promise<Response>;
  export function handleMe(req: NextRequest, deps: MemberDeps): Promise<Response>;
  export function handleSignOut(req: NextRequest, deps: MemberDeps): Promise<Response>;
  /** Member from an `Authorization: Bearer` header, else null. Used by checkout and orders. */
  export function memberFromBearer(req: Request, deps: Pick<MemberDeps, 'memberForToken' | 'now'>): Promise<Member | null>;
  /** Test hook. */
  export function resetMemberLimits(): void;
  ```
- Consumes: Task 2.

- [ ] **Step 1: Write the failing tests**

`src/lib/members/handlers.test.ts`:

```ts
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashCode } from './codes';
import { handleMe, handleRequestCode, handleSignOut, handleVerify, memberFromBearer, resetMemberLimits, type Member, type MemberDeps } from './handlers';

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
      if (!u) { u = { id: nextId++, email, name: null }; users.set(email, u); }
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
    expect(member).toEqual({ id: 1, email: 'runner@example.com', name: null });
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
    expect(await ok.json()).toEqual({ ok: true, member: { id: 1, email: 'runner@example.com', name: null } });
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
    expect(await memberFromBearer(new Request('https://x', { headers: { authorization: `Bearer ${token}` } }), f.deps)).toEqual({ id: 1, email: 'runner@example.com', name: null });
    expect(await memberFromBearer(new Request('https://x'), f.deps)).toBeNull();
    expect(await memberFromBearer(new Request('https://x', { headers: { authorization: 'Basic abc' } }), f.deps)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/members/handlers.test.ts`
Expected: FAIL, "Failed to resolve import './handlers'".

- [ ] **Step 3: Implement**

`src/lib/members/handlers.ts`:

```ts
/**
 * Email-code sign-in for members (spec §2). Routes are thin; every rule lives here
 * against injected deps so it is unit-tested without Prisma or Resend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { CODES_PER_HOUR, CODE_TTL_MS, MAX_CODE_ATTEMPTS, TOKEN_TTL_MS, hashCode, makeCode, makeToken, normaliseEmail } from './codes';

export type Member = { id: number; email: string; name: string | null };

export type MemberDeps = {
  saveCode: (email: string, hash: string, expires: Date) => Promise<void>;
  /** Every unexpired hash for the email. */
  codeHashes: (email: string, now: Date) => Promise<string[]>;
  deleteCodes: (email: string) => Promise<void>;
  findOrCreateUser: (email: string, now: Date) => Promise<Member>;
  createSession: (userId: number, token: string, expires: Date) => Promise<void>;
  /** Member for an unexpired token, else null. */
  memberForToken: (token: string, now: Date) => Promise<Member | null>;
  deleteSession: (token: string) => Promise<void>;
  attachGuestOrders: (userId: number, email: string) => Promise<void>;
  sendCode: (email: string, code: string) => Promise<void>;
  now?: () => number;
};

// In-memory like rate-limit.ts: resets on deploy, enough to stop a runaway client.
const requests = new Map<string, number[]>();
const attempts = new Map<string, number>();
export function resetMemberLimits() { requests.clear(); attempts.clear(); }

const json = (body: unknown, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers });
const bad = (error: string, status: number) => json({ ok: false, error }, status);

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try { const b = await req.json(); return b && typeof b === 'object' ? b : {}; } catch { return {}; }
}

/** POST auth/code { email } → { ok } (always ok for a well-formed email; no enumeration). */
export async function handleRequestCode(req: NextRequest, deps: MemberDeps): Promise<Response> {
  const email = normaliseEmail((await readJson(req)).email);
  if (!email) return bad('bad_email', 400);
  const now = deps.now ? deps.now() : Date.now();

  const recent = (requests.get(email) ?? []).filter((t) => t > now - 3_600_000);
  if (recent.length >= CODES_PER_HOUR) {
    const retryAfter = Math.ceil((recent[0] + 3_600_000 - now) / 1000);
    return json({ ok: false, error: 'too_many_codes' }, 429, { 'Retry-After': String(retryAfter) });
  }
  requests.set(email, [...recent, now]);

  const code = makeCode();
  await deps.saveCode(email, hashCode(email, code), new Date(now + CODE_TTL_MS));
  attempts.delete(email);
  try {
    await deps.sendCode(email, code);
  } catch (e) {
    console.error('Member code email failed:', e);
    return bad('email_unavailable', 503);
  }
  return json({ ok: true });
}

/** POST auth/verify { email, code } → { ok, token, member }. */
export async function handleVerify(req: NextRequest, deps: MemberDeps): Promise<Response> {
  const body = await readJson(req);
  const email = normaliseEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) return bad('bad_request', 400);
  const now = deps.now ? deps.now() : Date.now();

  const hashes = await deps.codeHashes(email, new Date(now));
  if (hashes.length === 0) return bad('expired', 410);
  if (!hashes.includes(hashCode(email, code))) {
    const n = (attempts.get(email) ?? 0) + 1;
    attempts.set(email, n);
    if (n >= MAX_CODE_ATTEMPTS) {
      await deps.deleteCodes(email);
      attempts.delete(email);
      return bad('expired', 410);
    }
    return bad('wrong_code', 401);
  }

  await deps.deleteCodes(email);
  attempts.delete(email);
  const member = await deps.findOrCreateUser(email, new Date(now));
  const token = makeToken();
  await deps.createSession(member.id, token, new Date(now + TOKEN_TTL_MS));
  await deps.attachGuestOrders(member.id, email);
  return json({ ok: true, token, member });
}

/** Member from `Authorization: Bearer <token>`, else null. */
export async function memberFromBearer(req: Request, deps: Pick<MemberDeps, 'memberForToken' | 'now'>): Promise<Member | null> {
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const now = deps.now ? deps.now() : Date.now();
  return deps.memberForToken(token, new Date(now));
}

/** GET auth/me → { ok, member } or 401. */
export async function handleMe(req: NextRequest, deps: MemberDeps): Promise<Response> {
  const member = await memberFromBearer(req, deps);
  return member ? json({ ok: true, member }) : bad('signed_out', 401);
}

/** POST auth/signout → { ok }. Deletes this token's session only. */
export async function handleSignOut(req: NextRequest, deps: MemberDeps): Promise<Response> {
  const [scheme, token] = (req.headers.get('authorization') ?? '').split(' ');
  if (scheme === 'Bearer' && token) await deps.deleteSession(token);
  return json({ ok: true });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/members/handlers.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/members/handlers.ts src/lib/members/handlers.test.ts
git commit -m "Members: email-code sign-in handlers"
```

---

### Task 4: Prisma store, code email, and the four auth routes

**Files:**
- Create: `src/lib/members/store.ts`
- Create: `src/lib/members/email.ts`
- Create: `src/app/api/app/v1/auth/code/route.ts`
- Create: `src/app/api/app/v1/auth/verify/route.ts`
- Create: `src/app/api/app/v1/auth/me/route.ts`
- Create: `src/app/api/app/v1/auth/signout/route.ts`

**Interfaces:**
- Produces: `liveMemberDeps: MemberDeps` (exported from `store.ts`) used by every member route and by checkout (Task 5) and orders (Task 6).
- Consumes: Task 3 types.

- [ ] **Step 1: The store**

`src/lib/members/store.ts`:

```ts
/** Prisma side of member sign-in. `verification_tokens` and `sessions` are NextAuth's unused tables. */
import { prisma } from '@/lib/db';
import type { Member, MemberDeps } from './handlers';
import { sendCodeEmail } from './email';

const toMember = (u: { id: number; email: string; name: string | null }): Member => ({ id: u.id, email: u.email, name: u.name });

export const liveMemberDeps: MemberDeps = {
  saveCode: async (email, hash, expires) => {
    await prisma.verification_tokens.create({ data: { identifier: email, token: hash, expires } });
  },
  codeHashes: async (email, now) =>
    (await prisma.verification_tokens.findMany({ where: { identifier: email, expires: { gt: now } }, select: { token: true } })).map((t) => t.token),
  deleteCodes: async (email) => {
    await prisma.verification_tokens.deleteMany({ where: { identifier: email } });
  },
  findOrCreateUser: async (email, now) => {
    const existing = await prisma.users.findUnique({ where: { email }, select: { id: true, email: true, name: true, email_verified_at: true } });
    if (existing) {
      if (!existing.email_verified_at) await prisma.users.update({ where: { id: existing.id }, data: { email_verified_at: now, updated_at: now } });
      return toMember(existing);
    }
    const created = await prisma.users.create({
      data: { email, access_tier: 'FREE', email_verified_at: now, updated_at: now },
      select: { id: true, email: true, name: true },
    });
    return toMember(created);
  },
  createSession: async (userId, token, expires) => {
    await prisma.sessions.create({ data: { user_id: userId, session_token: token, expires } });
  },
  memberForToken: async (token, now) => {
    const s = await prisma.sessions.findUnique({ where: { session_token: token }, include: { users: { select: { id: true, email: true, name: true } } } });
    return s && s.expires > now ? toMember(s.users) : null;
  },
  deleteSession: async (token) => {
    await prisma.sessions.deleteMany({ where: { session_token: token } });
  },
  attachGuestOrders: async (userId, email) => {
    await prisma.$executeRaw`UPDATE orders SET user_id = ${userId} WHERE lower(email) = ${email} AND user_id IS NULL`;
  },
  sendCode: sendCodeEmail,
};
```

- [ ] **Step 2: The code email**

`src/lib/members/email.ts` (its own sender: the shop's `send` bcc's Stephen on every mail, which a sign-in code must not do):

```ts
/** The six-digit sign-in code, by Resend. No bcc: this is the runner's credential. */
import { Resend } from 'resend';

const from = () => process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';

export async function sendCodeEmail(to: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const text = [`Your Film My Run sign-in code is ${code}.`, '', 'It works for 10 minutes. If you did not ask for it, ignore this email.', '', 'Stephen'].join('\n');
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:20px;line-height:1.5">
    <div style="border-bottom:3px solid #f88c00;padding-bottom:12px;margin-bottom:20px;font-weight:700">Film My Run</div>
    <p style="margin:0 0 8px">Your sign-in code is</p>
    <p style="font-family:ui-monospace,Menlo,monospace;font-size:32px;letter-spacing:6px;margin:0 0 16px">${code}</p>
    <p style="margin:0 0 8px">It works for 10 minutes. If you did not ask for it, ignore this email.</p>
    <p style="margin:0">Stephen</p>
  </div>`;
  await new Resend(key).emails.send({ from: from(), to, subject: `Your Film My Run code: ${code}`, text, html });
}
```

- [ ] **Step 3: The four routes**

`src/app/api/app/v1/auth/code/route.ts`:

```ts
import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleRequestCode } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

// Member sign-in, step 1 (spec §2.1). Per-email limit is inside the handler.
export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handleRequestCode(r, liveMemberDeps), { limit: 20 });
```

`src/app/api/app/v1/auth/verify/route.ts`:

```ts
import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleVerify } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

// Member sign-in, step 2 (spec §2.1).
export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handleVerify(r, liveMemberDeps), { limit: 30 });
```

`src/app/api/app/v1/auth/me/route.ts`:

```ts
import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleMe } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

export const dynamic = 'force-dynamic';
export const GET = withAppApi((r) => handleMe(r, liveMemberDeps));
```

`src/app/api/app/v1/auth/signout/route.ts`:

```ts
import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleSignOut } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handleSignOut(r, liveMemberDeps));
```

- [ ] **Step 4: Typecheck and full tests**

Run: `npm run typecheck && npm test`
Expected: both green (the members tests plus the existing ~590).

- [ ] **Step 5: Commit**

```bash
git add src/lib/members/store.ts src/lib/members/email.ts src/app/api/app/v1/auth
git commit -m "Members: /api/app/v1/auth code, verify, me, signout"
```

---

### Task 5: Member discount at checkout

**Files:**
- Create: `src/lib/members/checkout.ts`
- Test: `src/lib/members/checkout.test.ts`
- Create: `src/lib/members/current.ts`
- Modify: `src/app/api/shop/checkout/route.ts`

**Interfaces:**
- Produces:
  ```ts
  // checkout.ts (pure)
  export type MemberCheckout = {
    discounts: { coupon: string }[] | undefined;
    orderFields: { user_id?: number; email?: string };
    response: { member: boolean; reason?: 'signed_out' | 'no_coupon' };
  };
  export function memberCheckout(member: Member | null, hadBearer: boolean, coupon: string | undefined): MemberCheckout;
  // current.ts
  export function currentMember(req: Request): Promise<{ member: Member | null; hadBearer: boolean }>;
  ```
- Consumes: `memberFromBearer`, `liveMemberDeps`, `authOptions`.

- [ ] **Step 1: Write the failing test**

`src/lib/members/checkout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { memberCheckout } from './checkout';

const m = { id: 7, email: 'runner@example.com', name: null };

describe('memberCheckout', () => {
  it('applies the coupon and stamps the order for a member', () => {
    expect(memberCheckout(m, true, 'MEMBER10')).toEqual({
      discounts: [{ coupon: 'MEMBER10' }],
      orderFields: { user_id: 7, email: 'runner@example.com' },
      response: { member: true },
    });
  });
  it('does nothing for a guest', () => {
    expect(memberCheckout(null, false, 'MEMBER10')).toEqual({ discounts: undefined, orderFields: {}, response: { member: false } });
  });
  it('says signed_out when a bearer was sent but did not resolve', () => {
    expect(memberCheckout(null, true, 'MEMBER10').response).toEqual({ member: false, reason: 'signed_out' });
  });
  it('still stamps the order but says no_coupon when the coupon is not configured', () => {
    expect(memberCheckout(m, true, undefined)).toEqual({
      discounts: undefined,
      orderFields: { user_id: 7, email: 'runner@example.com' },
      response: { member: false, reason: 'no_coupon' },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/members/checkout.test.ts`
Expected: FAIL, cannot resolve './checkout'.

- [ ] **Step 3: Implement the pure part**

`src/lib/members/checkout.ts`:

```ts
/** What a member changes about a Stripe Checkout Session and the pending order (spec §3). Pure. */
import type { Member } from './handlers';

export type MemberCheckout = {
  discounts: { coupon: string }[] | undefined;
  orderFields: { user_id?: number; email?: string };
  response: { member: boolean; reason?: 'signed_out' | 'no_coupon' };
};

export function memberCheckout(member: Member | null, hadBearer: boolean, coupon: string | undefined): MemberCheckout {
  if (!member) return { discounts: undefined, orderFields: {}, response: hadBearer ? { member: false, reason: 'signed_out' } : { member: false } };
  const orderFields = { user_id: member.id, email: member.email };
  if (!coupon) return { discounts: undefined, orderFields, response: { member: false, reason: 'no_coupon' } };
  return { discounts: [{ coupon }], orderFields, response: { member: true } };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/members/checkout.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: The request → member resolver**

`src/lib/members/current.ts`:

```ts
/** The member behind a request: the app's bearer token first, else the website's NextAuth cookie. */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { memberFromBearer, type Member } from './handlers';
import { liveMemberDeps } from './store';

export async function currentMember(req: Request): Promise<{ member: Member | null; hadBearer: boolean }> {
  const hadBearer = (req.headers.get('authorization') ?? '').startsWith('Bearer ');
  if (hadBearer) return { member: await memberFromBearer(req, liveMemberDeps), hadBearer };
  const session = await getServerSession(authOptions);
  const id = Number(session?.user?.id);
  if (!session?.user?.email || !Number.isInteger(id)) return { member: null, hadBearer };
  return { member: { id, email: session.user.email.toLowerCase(), name: session.user.name ?? null }, hadBearer };
}
```

- [ ] **Step 6: Wire checkout**

In `src/app/api/shop/checkout/route.ts`:

Add imports after the existing ones:

```ts
import { currentMember } from '@/lib/members/current';
import { memberCheckout } from '@/lib/members/checkout';
```

Inside the second `try`, before `const order = await prisma.orders.create(`, add:

```ts
    const { member, hadBearer } = await currentMember(request);
    const mc = memberCheckout(member, hadBearer, process.env.STRIPE_MEMBER_COUPON);
```

Change the `orders.create` data to include the member fields:

```ts
      data: { status: 'pending', total_cents: total, currency: 'GBP', items: lines as object[], updated_at: new Date(), ...mc.orderFields },
```

In `stripe().checkout.sessions.create({ ... })`, after `mode: 'payment',` add:

```ts
      discounts: mc.discounts,
```

Change the final response line to:

```ts
    return NextResponse.json({ url: session.url, ...mc.response });
```

(`total_cents` on the pending row stays the full price; the webhook's `session.amount_total` is what the confirmation email quotes, and that carries the discount.)

- [ ] **Step 7: Typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: green. (`discounts: undefined` is accepted by Stripe's types; if the typecheck objects, spread it: `...(mc.discounts ? { discounts: mc.discounts } : {})`.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/members/checkout.ts src/lib/members/checkout.test.ts src/lib/members/current.ts src/app/api/shop/checkout/route.ts
git commit -m "Shop: 10% member coupon at checkout, orders stamped with the member"
```

---

### Task 6: Member orders API

**Files:**
- Create: `src/lib/members/orders.ts`
- Test: `src/lib/members/orders.test.ts`
- Create: `src/app/api/app/v1/orders/route.ts`
- Create: `src/app/api/app/v1/orders/[id]/route.ts`

**Interfaces:**
- Produces:
  ```ts
  export type OrderDTO = {
    id: number; placedAt: string; status: 'paid' | 'submitted' | 'shipped';
    items: { slug: string; name: string; variant: string; quantity: number; pricePence: number; imageUrl: string | null }[];
    totalPence: number; currency: string; trackingUrl: string | null;
  };
  export type OrderRow = { id: number; created_at: Date; status: string; items: unknown; total_cents: number; currency: string; tracking_url: string | null; user_id: number | null };
  export function toOrderDTO(row: OrderRow): OrderDTO | null;   // null for pending or unknown status
  export type OrderDeps = { ordersFor: (userId: number) => Promise<OrderRow[]>; orderById: (id: number) => Promise<OrderRow | null> } & Pick<MemberDeps, 'memberForToken' | 'now'>;
  export function handleListOrders(req: NextRequest, deps: OrderDeps): Promise<Response>;
  export function handleGetOrder(req: NextRequest, id: string, deps: OrderDeps): Promise<Response>;
  export const liveOrderDeps: OrderDeps;
  ```
- Consumes: `memberFromBearer` (Task 3), `liveMemberDeps` (Task 4), `tracking_url` (Task 1), `OrderLine` shape from `src/lib/shop/orders.ts`.

- [ ] **Step 1: Write the failing tests**

`src/lib/members/orders.test.ts`:

```ts
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { handleGetOrder, handleListOrders, toOrderDTO, type OrderDeps, type OrderRow } from './orders';

const NOW = Date.UTC(2026, 8, 21);
const line = { slug: 'run-tee', name: 'Run tee', variantLabel: 'Black / M', image: 'https://img/1.jpg', supplier: 'printify', supplierProductId: 'p1', variantId: 1, quantity: 2, unitPence: 1999 };
const row = (over: Partial<OrderRow>): OrderRow => ({ id: 1, created_at: new Date(NOW), status: 'paid', items: [line], total_cents: 4357, currency: 'GBP', tracking_url: null, user_id: 7, ...over });

describe('toOrderDTO', () => {
  it('maps a row', () => {
    expect(toOrderDTO(row({ status: 'shipped', tracking_url: 'https://track/1' }))).toEqual({
      id: 1, placedAt: '2026-09-21T00:00:00.000Z', status: 'shipped',
      items: [{ slug: 'run-tee', name: 'Run tee', variant: 'Black / M', quantity: 2, pricePence: 1999, imageUrl: 'https://img/1.jpg' }],
      totalPence: 4357, currency: 'GBP', trackingUrl: 'https://track/1',
    });
  });
  it('drops pending and unknown statuses', () => {
    expect(toOrderDTO(row({ status: 'pending' }))).toBeNull();
    expect(toOrderDTO(row({ status: 'weird' }))).toBeNull();
  });
});

function deps(rows: OrderRow[], memberId: number | null = 7): OrderDeps {
  return {
    ordersFor: async (userId) => rows.filter((r) => r.user_id === userId),
    orderById: async (id) => rows.find((r) => r.id === id) ?? null,
    memberForToken: async (token) => (token === 'good' && memberId ? { id: memberId, email: 'r@e.com', name: null } : null),
    now: () => NOW,
  };
}
const req = (path: string, token?: string) => new NextRequest(`https://filmmyrun.com/api/app/v1/orders${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('handleListOrders', () => {
  it('returns the member\'s non-pending orders, newest first', async () => {
    const rows = [row({ id: 1, created_at: new Date(NOW - 1000) }), row({ id: 2, status: 'pending' }), row({ id: 3, user_id: 8 }), row({ id: 4, status: 'shipped' })];
    const res = await handleListOrders(req('', 'good'), deps(rows));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders.map((o: { id: number }) => o.id)).toEqual([4, 1]);
  });
  it('is 401 without a live token', async () => {
    expect((await handleListOrders(req(''), deps([]))).status).toBe(401);
    expect((await handleListOrders(req('', 'bad'), deps([]))).status).toBe(401);
  });
});

describe('handleGetOrder', () => {
  it('returns one order, 404 for another member\'s or a pending one, 400 for a bad id', async () => {
    const rows = [row({ id: 1 }), row({ id: 2, user_id: 8 }), row({ id: 3, status: 'pending' })];
    expect((await handleGetOrder(req('/1', 'good'), '1', deps(rows))).status).toBe(200);
    expect((await (await handleGetOrder(req('/1', 'good'), '1', deps(rows))).json()).order.id).toBe(1);
    expect((await handleGetOrder(req('/2', 'good'), '2', deps(rows))).status).toBe(404);
    expect((await handleGetOrder(req('/3', 'good'), '3', deps(rows))).status).toBe(404);
    expect((await handleGetOrder(req('/9', 'good'), '9', deps(rows))).status).toBe(404);
    expect((await handleGetOrder(req('/x', 'good'), 'x', deps(rows))).status).toBe(400);
    expect((await handleGetOrder(req('/1'), '1', deps(rows))).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/members/orders.test.ts`
Expected: FAIL, cannot resolve './orders'.

- [ ] **Step 3: Implement**

`src/lib/members/orders.ts`:

```ts
/** A member's orders (spec §4). Rows in, DTOs out; Prisma only in liveOrderDeps. */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { OrderLine } from '@/lib/shop/orders';
import { memberFromBearer, type MemberDeps } from './handlers';
import { liveMemberDeps } from './store';

export type OrderDTO = {
  id: number;
  placedAt: string;
  status: 'paid' | 'submitted' | 'shipped';
  items: { slug: string; name: string; variant: string; quantity: number; pricePence: number; imageUrl: string | null }[];
  totalPence: number;
  currency: string;
  trackingUrl: string | null;
};

export type OrderRow = { id: number; created_at: Date; status: string; items: unknown; total_cents: number; currency: string; tracking_url: string | null; user_id: number | null };

const VISIBLE = new Set(['paid', 'submitted', 'shipped']);

export function toOrderDTO(row: OrderRow): OrderDTO | null {
  if (!VISIBLE.has(row.status)) return null;
  const lines = Array.isArray(row.items) ? (row.items as OrderLine[]) : [];
  return {
    id: row.id,
    placedAt: row.created_at.toISOString(),
    status: row.status as OrderDTO['status'],
    items: lines.map((l) => ({ slug: l.slug, name: l.name, variant: l.variantLabel ?? '', quantity: l.quantity, pricePence: l.unitPence, imageUrl: l.image ?? null })),
    totalPence: row.total_cents,
    currency: row.currency,
    trackingUrl: row.tracking_url,
  };
}

export type OrderDeps = {
  ordersFor: (userId: number) => Promise<OrderRow[]>;
  orderById: (id: number) => Promise<OrderRow | null>;
} & Pick<MemberDeps, 'memberForToken' | 'now'>;

const signedOut = () => NextResponse.json({ ok: false, error: 'signed_out' }, { status: 401 });

/** GET /api/app/v1/orders */
export async function handleListOrders(req: NextRequest, deps: OrderDeps): Promise<Response> {
  const member = await memberFromBearer(req, deps);
  if (!member) return signedOut();
  const rows = await deps.ordersFor(member.id);
  const orders = rows.map(toOrderDTO).filter((o): o is OrderDTO => o !== null).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  return NextResponse.json({ ok: true, orders });
}

/** GET /api/app/v1/orders/{id} */
export async function handleGetOrder(req: NextRequest, id: string, deps: OrderDeps): Promise<Response> {
  const member = await memberFromBearer(req, deps);
  if (!member) return signedOut();
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 });
  const row = await deps.orderById(n);
  const order = row && row.user_id === member.id ? toOrderDTO(row) : null;
  if (!order) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}

const select = { id: true, created_at: true, status: true, items: true, total_cents: true, currency: true, tracking_url: true, user_id: true } as const;

export const liveOrderDeps: OrderDeps = {
  ordersFor: (userId) => prisma.orders.findMany({ where: { user_id: userId }, select, orderBy: { created_at: 'desc' } }),
  orderById: (id) => prisma.orders.findUnique({ where: { id }, select }),
  memberForToken: liveMemberDeps.memberForToken,
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/members/orders.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Routes**

`src/app/api/app/v1/orders/route.ts`:

```ts
import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleListOrders, liveOrderDeps } from '@/lib/members/orders';

export const dynamic = 'force-dynamic';
export const GET = withAppApi((r) => handleListOrders(r, liveOrderDeps));
```

`src/app/api/app/v1/orders/[id]/route.ts`:

```ts
import type { NextRequest } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/app-api/rate-limit';
import { handleGetOrder, liveOrderDeps } from '@/lib/members/orders';

export const dynamic = 'force-dynamic';

// withAppApi's handler takes only the request; dynamic segments need the second argument, so the limit is applied by hand.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const retryAfter = checkRateLimit(`/api/app/v1/orders/[id]:${clientIp(request)}`);
  if (retryAfter !== null) return new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), { status: 429, headers: { 'Retry-After': String(retryAfter), 'content-type': 'application/json' } });
  const { id } = await params;
  const response = await handleGetOrder(request, id, liveOrderDeps);
  response.headers.set('X-FMR-API', 'v1');
  return response;
}
```

- [ ] **Step 6: Typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: green. (`params` as a Promise is Next 15's shape; `src/app/shop/[slug]/page.tsx` awaits it the same way.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/members/orders.ts src/lib/members/orders.test.ts src/app/api/app/v1/orders
git commit -m "Members: /api/app/v1/orders list and detail"
```

---

### Task 7: Tracking URL written on shipment

**Files:**
- Modify: `src/app/api/shop/webhook/printify/route.ts:26`
- Modify: `src/app/api/shop/cron/shipments/route.ts:21`

**Interfaces:**
- Consumes: `orders.tracking_url` (Task 1).

- [ ] **Step 1: Printify webhook**

Replace line 26 of `src/app/api/shop/webhook/printify/route.ts`:

```ts
  await prisma.orders.update({ where: { id: order.id }, data: { status: 'shipped', tracking_url: s.url || null, updated_at: new Date() } });
```

- [ ] **Step 2: Contrado cron**

Replace line 21 of `src/app/api/shop/cron/shipments/route.ts`:

```ts
    await prisma.orders.update({ where: { id: o.id }, data: { status: 'shipped', tracking_url: s.trackingUrl ?? null, updated_at: new Date() } });
```

- [ ] **Step 3: Typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/shop/webhook/printify/route.ts src/app/api/shop/cron/shipments/route.ts
git commit -m "Shop: keep the tracking URL on the order when it ships"
```

---

### Task 8: "Email me a code" on the website's login page

**Files:**
- Modify: `src/lib/auth.ts` (providers array)
- Create: `src/components/auth/CodeSignIn.tsx`
- Modify: `src/components/auth/LoginForm.tsx` (mount `CodeSignIn` above the password form)
- Modify: `src/components/auth/RegisterForm.tsx` (one line: "Or just sign in with a code")

**Interfaces:**
- Consumes: `/api/app/v1/auth/code` and `/verify` (Task 4); `liveMemberDeps.memberForToken`.
- Produces: NextAuth provider `id: 'code'` accepting `{ token }`.

- [ ] **Step 1: The `code` provider**

In `src/lib/auth.ts`, add to the `providers` array after the existing `CredentialsProvider({ name: 'credentials', ... })`:

```ts
    // A bearer token freshly issued by /api/app/v1/auth/verify (spec §2.3): the
    // website's own pages sign the NextAuth session in with it.
    CredentialsProvider({
      id: 'code',
      name: 'code',
      credentials: { token: { label: 'Token', type: 'text' } },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        const { liveMemberDeps } = await import('./members/store');
        const member = await liveMemberDeps.memberForToken(credentials.token, new Date());
        if (!member) return null;
        const user = await prisma.users.findUnique({ where: { id: member.id } });
        if (!user) return null;
        return { id: String(user.id), email: user.email, name: user.name, image: user.image, accessTier: user.access_tier };
      },
    }),
```

(The dynamic import avoids a module cycle: `store.ts` does not import `auth.ts`, but `current.ts` imports both; keeping `auth.ts` free of a static `members/store` import keeps the graph one-way.)

- [ ] **Step 2: The component**

`src/components/auth/CodeSignIn.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';

const MESSAGES: Record<string, string> = {
  wrong_code: "That code isn't right",
  expired: 'That code has expired, send a new one',
  too_many_codes: 'Too many tries, wait a few minutes',
  email_unavailable: "We couldn't send the code just now, try again in a minute",
  bad_email: 'That email address does not look right',
};

/** Email → six-digit code → NextAuth session, using the same routes as the app (spec §2.3). */
export default function CodeSignIn({ callbackUrl = '/' }: { callbackUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (path: string, body: unknown) => {
    const res = await fetch(`/api/app/v1/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = (await res.json()) as { ok: boolean; error?: string; token?: string };
    if (!res.ok || !data.ok) throw new Error(MESSAGES[data.error ?? ''] ?? 'Something went wrong. Please try again.');
    return data;
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await post('code', { email }); setStep('code'); setCode(''); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { token } = await post('verify', { email, code });
      const result = await signIn('code', { token, redirect: false });
      if (result?.error) throw new Error('Something went wrong. Please try again.');
      router.push(callbackUrl);
      router.refresh();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };

  const input = 'w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-surface-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-brand';
  const button = 'w-full py-3 rounded-lg bg-brand text-black font-semibold hover:bg-orange-400 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2';

  if (step === 'email') {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} aria-label="Email" />
        </div>
        <button type="submit" disabled={busy || !email} className={button}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Email me a code
        </button>
        <p className="text-xs text-muted">No password needed. Members get 10% off in the shop.</p>
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-sm text-secondary">We sent a six-digit code to <span className="text-foreground">{email}</span>.</p>
      <input inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="w-full px-4 py-3 rounded-lg border border-border bg-surface-secondary text-foreground font-mono text-2xl tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-brand" aria-label="Six-digit code" />
      <button type="submit" disabled={busy || code.length !== 6} className={button}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        Sign in
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={() => { setStep('email'); setError(null); }} className="text-muted hover:text-foreground">Change email</button>
        <button type="button" onClick={(e) => sendCode(e as unknown as React.FormEvent)} disabled={busy} className="text-brand hover:underline">Send a new code</button>
      </div>
      {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Mount it**

In `src/components/auth/LoginForm.tsx`: add `import CodeSignIn from './CodeSignIn';` and, inside the card directly under the "Welcome back" heading block (before the Google button), insert:

```tsx
        <CodeSignIn callbackUrl={callbackUrl} />
        <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="flex-1 h-px bg-border" />or<span className="flex-1 h-px bg-border" /></div>
```

In `src/components/auth/RegisterForm.tsx`, under the submit button, add:

```tsx
        <p className="text-sm text-muted mt-4 text-center">Or skip the password: <Link href="/login" className="text-brand hover:underline">sign in with an emailed code</Link>.</p>
```

(Add `import Link from 'next/link';` if the file does not already import it.)

- [ ] **Step 4: Typecheck, tests, and a local run**

Run: `npm run typecheck && npm test`
Expected: green.

Run `npm run dev`, open `http://localhost:3000/login`, enter your email, get the code from Resend (needs `RESEND_API_KEY` locally; without it the route answers 503 and the form shows the "couldn't send" message, which is the expected local behaviour), sign in, confirm the header's `UserMenu` shows you.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/components/auth/CodeSignIn.tsx src/components/auth/LoginForm.tsx src/components/auth/RegisterForm.tsx
git commit -m "Login: email me a code, the app's sign-in on the website"
```

---

### Task 9: `/account/orders` pages

**Files:**
- Create: `src/app/account/orders/page.tsx`
- Create: `src/app/account/orders/[id]/page.tsx`
- Create: `src/components/account/OrderSummary.tsx`
- Modify: `src/components/auth/UserMenu.tsx` (add a "Your orders" item next to the existing `/account` link at line ~191)

**Interfaces:**
- Consumes: `toOrderDTO`, `liveOrderDeps` (Task 6); `getServerSession(authOptions)`.
- `/account` is already in `middleware.ts`'s `protectedRoutes`, so unauthenticated visitors are redirected to `/login?callbackUrl=…`.

- [ ] **Step 1: Shared summary component**

`src/components/account/OrderSummary.tsx`:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import type { OrderDTO } from '@/lib/members/orders';
import { gbp } from '@/lib/shop/orders';

export const STATUS_LABEL: Record<OrderDTO['status'], string> = { paid: 'Paid', submitted: 'In production', shipped: 'Shipped' };

export function placed(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function OrderSummary({ order, link }: { order: OrderDTO; link?: boolean }) {
  const first = order.items[0];
  const title = order.items.length === 1 ? first.name : `${order.items.length} items`;
  const body = (
    <div className="flex gap-4 p-4">
      <div className="relative w-20 h-20 rounded-lg bg-white overflow-hidden shrink-0">
        {first?.imageUrl && <Image src={first.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-secondary">Order #{order.id} · {placed(order.placedAt)}</p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-brand/10 text-xs text-foreground">{STATUS_LABEL[order.status]}</span>
      </div>
      <p className="font-mono text-foreground">{gbp(order.totalPence)}</p>
    </div>
  );
  return link ? <Link href={`/account/orders/${order.id}`} className="block hover:bg-surface/60">{body}</Link> : body;
}
```

- [ ] **Step 2: The list page**

`src/app/account/orders/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { liveOrderDeps, toOrderDTO, type OrderDTO } from '@/lib/members/orders';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import OrderSummary from '@/components/account/OrderSummary';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your orders', robots: { index: false } };

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  const rows = Number.isInteger(userId) ? await liveOrderDeps.ordersFor(userId) : [];
  const orders = rows.map(toOrderDTO).filter((o): o is OrderDTO => o !== null);
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 bg-background">
        <div className="container max-w-2xl">
          <h1 className="text-3xl font-display font-bold text-foreground mb-6">Your orders</h1>
          {orders.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-secondary border border-border text-center">
              <p className="text-secondary">Nothing yet. Your first order will appear here.</p>
              <Link href="/shop" className="inline-block mt-4 text-brand hover:underline">Go to the shop</Link>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-2xl bg-surface-secondary border border-border">
              {orders.map((o) => <li key={o.id}><OrderSummary order={o} link /></li>)}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: The detail page**

`src/app/account/orders/[id]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { liveOrderDeps, toOrderDTO } from '@/lib/members/orders';
import { gbp } from '@/lib/shop/orders';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import OrderSummary from '@/components/account/OrderSummary';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order', robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  const n = Number(id);
  const row = Number.isInteger(n) ? await liveOrderDeps.orderById(n) : null;
  const order = row && row.user_id === userId ? toOrderDTO(row) : null;
  if (!order) notFound();
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 bg-background">
        <div className="container max-w-2xl">
          <Link href="/account/orders" className="text-sm text-muted hover:text-brand">&larr; Your orders</Link>
          <h1 className="text-3xl font-display font-bold text-foreground mt-4 mb-6">Order #{order.id}</h1>
          <div className="rounded-2xl bg-surface-secondary border border-border"><OrderSummary order={order} /></div>
          <ul className="mt-6 divide-y divide-border rounded-2xl bg-surface-secondary border border-border">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4 p-4">
                <div>
                  <p className="text-foreground">{it.quantity} × {it.name}</p>
                  {it.variant && <p className="text-sm text-secondary">{it.variant}</p>}
                </div>
                <p className="font-mono text-foreground">{gbp(it.pricePence * it.quantity)}</p>
              </li>
            ))}
            <li className="flex justify-between p-4"><p className="text-secondary">Total paid, including postage</p><p className="font-mono text-foreground">{gbp(order.totalPence)}</p></li>
          </ul>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex mt-6 px-6 py-3 rounded-xl bg-brand text-black font-semibold hover:bg-orange-400">Track parcel</a>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Menu item**

In `src/components/auth/UserMenu.tsx`, next to the existing `href="/account"` item (around line 191), add a sibling item with the same classes and `href="/account/orders"` labelled "Your orders".

- [ ] **Step 5: Typecheck, tests, local check**

Run: `npm run typecheck && npm test`
Expected: green. `npm run dev`, sign in, open `/account/orders`: the empty state renders.

- [ ] **Step 6: Commit**

```bash
git add src/app/account/orders src/components/account/OrderSummary.tsx src/components/auth/UserMenu.tsx
git commit -m "Account: your orders, list and detail"
```

---

### Task 10: Member price on the product page and basket

**Files:**
- Create: `src/lib/members/price.ts`
- Test: `src/lib/members/price.test.ts`
- Create: `src/components/shop/MemberLine.tsx`
- Modify: `src/components/shop/BuyBox.tsx:32` (the price line)
- Modify: `src/components/shop/Basket.tsx:73-78` (the subtotal block)

**Interfaces:**
- Produces: `memberPrice(pounds: number): number` (× 0.9, rounded half up to the penny), `MEMBER_DISCOUNT = 0.1`.
- Consumes: `useAuth()` from `@/contexts/AuthContext`.

- [ ] **Step 1: Write the failing test**

`src/lib/members/price.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { memberPrice } from './price';

describe('memberPrice', () => {
  it('takes 10% off, rounded half up to the penny', () => {
    expect(memberPrice(19.99)).toBe(17.99);
    expect(memberPrice(24.5)).toBe(22.05);
    expect(memberPrice(0.05)).toBe(0.05);
    expect(memberPrice(29.95)).toBe(26.96);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/members/price.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/members/price.ts`:

```ts
/** The member price shown in the client (spec §3). Stripe computes the real figure from the coupon. */
export const MEMBER_DISCOUNT = 0.1;
export const memberPrice = (pounds: number) => Math.round((pounds * (1 - MEMBER_DISCOUNT) + 1e-9) * 100) / 100;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/members/price.test.ts`
Expected: PASS.

- [ ] **Step 5: The line component**

`src/components/shop/MemberLine.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { memberPrice } from '@/lib/members/price';

/** "Members save 10% · Sign in" for guests; the member price for members (spec §3.1). */
export default function MemberLine({ pounds, label = 'Member price' }: { pounds: number; label?: string }) {
  const { isAuthenticated, status } = useAuth();
  const pathname = usePathname();
  if (status === 'loading') return null;
  if (!isAuthenticated) {
    return (
      <p className="text-sm text-secondary mt-1">
        Members save 10% · <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} className="text-brand hover:underline">Sign in</Link>
      </p>
    );
  }
  return <p className="text-sm text-foreground mt-1">{label} <span className="font-mono">£{memberPrice(pounds).toFixed(2)}</span></p>;
}
```

- [ ] **Step 6: Product page**

In `src/components/shop/BuyBox.tsx`, add `import MemberLine from './MemberLine';` and replace the price line (line 32):

```tsx
      <p className="font-mono text-2xl text-foreground mt-5">£{(variant ?? item.variants[0]).price.toFixed(2)}</p>
      <MemberLine pounds={(variant ?? item.variants[0]).price} />
```

- [ ] **Step 7: Basket**

In `src/components/shop/Basket.tsx`, add `import { useAuth } from '@/contexts/AuthContext';` and `import { memberPrice } from '@/lib/members/price';` and `import MemberLine from './MemberLine';`. Inside the component, after `const subtotal = …`, add:

```tsx
  const { isAuthenticated } = useAuth();
  const discount = isAuthenticated ? Math.round((subtotal - memberPrice(subtotal)) * 100) / 100 : 0;
```

Replace the subtotal block (the `<div>` holding "Subtotal", the figure and the postage line) with:

```tsx
        <div>
          <p className="text-secondary text-sm">Subtotal</p>
          <p className="font-mono text-2xl text-foreground">£{subtotal.toFixed(2)}</p>
          {isAuthenticated ? (
            <p className="text-sm text-foreground">Member discount <span className="font-mono">−£{discount.toFixed(2)}</span> · you pay <span className="font-mono">£{(subtotal - discount).toFixed(2)}</span> plus postage</p>
          ) : (
            <MemberLine pounds={subtotal} />
          )}
          <p className="text-xs text-muted mt-1">UK postage added at checkout (from £3.59).{isAuthenticated ? ' Member discount applied at checkout.' : ''}</p>
        </div>
```

- [ ] **Step 8: Typecheck, tests, local check**

Run: `npm run typecheck && npm test`
Expected: green. `npm run dev`: signed out, a product shows "Members save 10% · Sign in"; signed in, "Member price £17.99" under a £19.99 tee and the basket shows the discount line.

- [ ] **Step 9: Commit**

```bash
git add src/lib/members/price.ts src/lib/members/price.test.ts src/components/shop/MemberLine.tsx src/components/shop/BuyBox.tsx src/components/shop/Basket.tsx
git commit -m "Shop: member price on the product page and basket"
```

---

### Task 11: Coupon, migration, push, live check

**Files:** none in the repo. Railway env and Stripe.

- [ ] **Step 1: Create the coupon in Stripe (test mode first, then live)**

With the test secret key from Railway (`railway variables --json | jq -r .STRIPE_SECRET_KEY` shows which mode the site runs in by its `sk_test_`/`sk_live_` prefix; use the matching key):

```bash
KEY="$(cd ~/Developer/film-my-run-website && railway variables --json | jq -r .STRIPE_SECRET_KEY)"
curl -s https://api.stripe.com/v1/coupons -u "$KEY:" -d id=MEMBER10 -d percent_off=10 -d duration=forever -d name="Member discount" | jq '{id, percent_off, duration, valid}'
```

Expected: `{"id":"MEMBER10","percent_off":10,"duration":"forever","valid":true}`. Do not print the key.

- [ ] **Step 2: Set the env**

```bash
railway variables --set STRIPE_MEMBER_COUPON=MEMBER10
```

- [ ] **Step 3: Apply the migration**

```bash
DATABASE_URL="$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL)" npx prisma migrate deploy
```

Expected: "1 migration applied" (`20260921090000_orders_tracking_url`).

- [ ] **Step 4: Push**

```bash
npm run typecheck && npm test && git push
```

- [ ] **Step 5: Live checks (after Railway reports the deploy done)**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://filmmyrun.com/api/app/v1/auth/me            # 401
curl -s -X POST https://filmmyrun.com/api/app/v1/auth/code -H 'content-type: application/json' -d '{"email":"stephen.cousins@gmail.com"}'   # {"ok":true}, and a code arrives
curl -s -o /dev/null -w '%{http_code}\n' https://filmmyrun.com/account/orders                  # 307 to /login
```

Then in a browser: `/login` → Email me a code → sign in → `/account/orders` empty state → a product shows "Member price" → basket → Checkout → the Stripe page shows "Member discount −10%". Pay for one cheap item if you want the full loop, then refund it in Stripe and cancel in Printify; the order then appears under Your orders as "Paid" (refunds do not change status, spec §6).

- [ ] **Step 6: Record it**

Add the four auth routes and the two orders routes to `docs/app-api.md` (request, response, status codes, the bearer header), and note `STRIPE_MEMBER_COUPON` beside the other shop env vars there; commit and push with the same checks.

---

## Self-review

- Spec coverage: §2.1 flow → Tasks 2–4; §2.2 limits → Task 3 (per-email, attempts) and Task 4 (`withAppApi` per-IP); §2.3 website → Task 8; §3 discount and §3.1 strings → Tasks 5 and 10; §4.1–4.3 → Tasks 6, 7, 4 (`attachGuestOrders`); §4.4 → Task 9; §6 stale-token `signed_out` → Task 5; §7 website tests → each task's test file; §8 step 1 and 2 → Tasks 1–7 and 8–10 with the push in Task 11.
- Not in the website plan by design: the app (separate plan), Sign in with Apple, refund status, the Adrian tier rename (spec §9).
- Types: `Member` defined once in Task 3 and imported everywhere; `OrderRow`/`OrderDTO` from Task 6 reused by Task 9; `memberFromBearer`'s deps type is `Pick<MemberDeps, 'memberForToken' | 'now'>` so `OrderDeps` satisfies it.
