// Swap a news story's photo for the branded card (e.g. a photographer asks for it back).
// Run: npm run news:unimage <story id>
import { prisma } from '@/lib/db';
import { brandedCard } from '@/lib/news/image';
import { uploadToR2 } from '@/lib/r2';

(async () => {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id)) throw new Error('Usage: npm run news:unimage <story id>');
  const s = await prisma.news_stories.findUniqueOrThrow({ where: { id } });
  const url = await uploadToR2(`news/${s.slug}-card.webp`, await brandedCard(s.title), 'image/webp');
  await prisma.news_stories.update({ where: { id }, data: { image_url: url, photo_credit: null } });
  console.log(`Story ${id} now uses the branded card: ${url}`);
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
