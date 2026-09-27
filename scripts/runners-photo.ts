// Takes a photo off a runner's page (a takedown or an invoice): the branded card shows instead.
//
// Run:   npm run runners:photo -- <slug> --remove portrait|action
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { RunnerPhoto } from '@/lib/runners/types';

(async () => {
  const [slug, flag, kind] = process.argv.slice(2);
  if (!slug || flag !== '--remove' || !['portrait', 'action'].includes(kind)) throw new Error('Usage: npm run runners:photo -- <slug> --remove portrait|action');
  const r = await prisma.runners.findUnique({ where: { slug } });
  if (!r) throw new Error(`No runner ${slug}`);
  const photos = (r.photos as unknown as RunnerPhoto[]).filter((p) => p.kind !== kind);
  await prisma.runners.update({ where: { slug }, data: { photos: photos as unknown as Prisma.InputJsonValue } });
  console.log(`Removed the ${kind} photo from ${slug}. The R2 file stays (nothing links it).`);
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect().catch(() => {}); process.exit(1); });
