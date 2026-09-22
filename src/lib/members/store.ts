/** Prisma side of member sign-in. `verification_tokens` and `sessions` are NextAuth's unused tables. */
import { prisma } from '@/lib/db';
import type { Member, MemberDeps } from './handlers';
import { sendCodeEmail } from './email';

type UserRow = { id: number; email: string; name: string | null; access_tier: 'FREE' | 'PREMIUM' | 'PRO'; subscription_end: Date | null };
const memberSelect = { id: true, email: true, name: true, access_tier: true, subscription_end: true } as const;
/** Pro while the tier is PRO and the end (if any) is ahead; a PRO tier with no end is Stephen's hand-set forever. */
export const toMember = (u: UserRow, now = new Date()): Member => ({
  id: u.id,
  email: u.email,
  name: u.name,
  proUntil: u.access_tier === 'PRO' && (!u.subscription_end || u.subscription_end > now) ? (u.subscription_end ?? new Date('9999-12-31T00:00:00Z')).toISOString() : null,
});

export const liveMemberDeps: MemberDeps = {
  saveCode: async (email, hash, expires) => {
    await prisma.verification_tokens.deleteMany({ where: { identifier: email, expires: { lt: new Date() } } });
    await prisma.verification_tokens.create({ data: { identifier: email, token: hash, expires } });
  },
  codeHashes: async (email, now) =>
    (await prisma.verification_tokens.findMany({ where: { identifier: email, expires: { gt: now } }, select: { token: true } })).map((t) => t.token),
  deleteCodes: async (email) => {
    await prisma.verification_tokens.deleteMany({ where: { identifier: email } });
  },
  findOrCreateUser: async (email, now) => {
    const existing = await prisma.users.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { ...memberSelect, email_verified_at: true } });
    if (existing) {
      if (!existing.email_verified_at) await prisma.users.update({ where: { id: existing.id }, data: { email_verified_at: now, updated_at: now } });
      return toMember(existing, now);
    }
    const created = await prisma.users.create({
      data: { email, access_tier: 'FREE', email_verified_at: now, updated_at: now },
      select: memberSelect,
    });
    return toMember(created, now);
  },
  createSession: async (userId, token, expires) => {
    await prisma.sessions.create({ data: { user_id: userId, session_token: token, expires } });
  },
  memberForToken: async (token, now) => {
    const s = await prisma.sessions.findUnique({ where: { session_token: token }, include: { users: { select: memberSelect } } });
    return s && s.expires > now ? toMember(s.users, now) : null;
  },
  deleteSession: async (token) => {
    await prisma.sessions.deleteMany({ where: { session_token: token } });
  },
  attachGuestOrders: async (userId, email) => {
    await prisma.$executeRaw`UPDATE orders SET user_id = ${userId} WHERE lower(email) = ${email} AND user_id IS NULL`;
  },
  setPro: async (userId, until) => {
    const u = await prisma.users.findUniqueOrThrow({ where: { id: userId }, select: memberSelect });
    // Never shorten: a PRO tier with no end is hand-set and stays; a later end stays.
    const keep = u.access_tier === 'PRO' && (!u.subscription_end || u.subscription_end >= until);
    if (keep) return toMember(u);
    return toMember(await prisma.users.update({ where: { id: userId }, data: { access_tier: 'PRO', subscription_end: until, updated_at: new Date() }, select: memberSelect }));
  },
  sendCode: sendCodeEmail,
};
