/** The member behind a request: the app's bearer token first, else the website's NextAuth cookie. */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkProHeader } from '@/lib/chat/pro';
import { memberFromBearer, type Member } from './handlers';
import { liveMemberDeps, toMember } from './store';

/**
 * `pro`: the request carried a valid `X-FMR-Pro` proof (with `X-FMR-Install`),
 * so the app's subscriber gets member pricing even before they sign in.
 */
export async function currentMember(req: Request): Promise<{ member: Member | null; hadBearer: boolean; pro: boolean }> {
  const install = req.headers.get('X-FMR-Install') ?? '';
  const pro = checkProHeader(req.headers.get('X-FMR-Pro'), install).ok;
  const hadBearer = (req.headers.get('authorization') ?? '').startsWith('Bearer ');
  if (hadBearer) return { member: await memberFromBearer(req, liveMemberDeps), hadBearer, pro };
  const session = await getServerSession(authOptions);
  const id = Number(session?.user?.id);
  if (!session?.user?.email || !Number.isInteger(id)) return { member: null, hadBearer, pro };
  const row = await prisma.users.findUnique({ where: { id }, select: { id: true, email: true, name: true, access_tier: true, subscription_end: true } });
  return { member: row ? toMember(row) : null, hadBearer, pro };
}
