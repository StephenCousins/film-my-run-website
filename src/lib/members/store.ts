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
