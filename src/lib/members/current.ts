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
