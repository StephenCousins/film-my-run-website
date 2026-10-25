import { prisma } from '@/lib/db';

const KEEP_MS = 90 * 86_400_000;

/** Deletes Ask Wilson log rows older than 90 days. Returns how many. */
export async function purgeWilsonLog(now = new Date()): Promise<number> {
  const r = await prisma.assistant_messages.deleteMany({ where: { source: 'wilson', created_at: { lt: new Date(now.getTime() - KEEP_MS) } } });
  return r.count;
}
