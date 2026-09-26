// Publish a held news story by hand, with the branded card as its image.
// Run: npm run news:publish <story id>
import { prisma } from '@/lib/db';
import { brandedCard } from '@/lib/news/image';
import { uploadToR2 } from '@/lib/r2';

(async () => {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id)) throw new Error('Usage: npm run news:publish <story id>');
  const s = await prisma.news_stories.findUniqueOrThrow({ where: { id } });
  if (s.status !== 'held') throw new Error(`Story ${id} is ${s.status}, not held`);
  const url = await uploadToR2(`news/${s.slug}.webp`, await brandedCard(s.title), 'image/webp');
  await prisma.news_stories.update({ where: { id }, data: { status: 'published', published_at: new Date(), image_url: url, photo_credit: null, held_reason: null } });
  console.log(`Published story ${id}: https://filmmyrun.com/news/${s.slug}`);
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
