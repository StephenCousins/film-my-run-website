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
