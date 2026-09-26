// Make the ready-sized card copy (shoes/card/<slug>.webp) for every shoe photo already on R2.
// New photos get one from storeImage; this backfills the rest. Safe to re-run.
// Usage: npx tsx --env-file=.env scripts/shoe-card-images.ts [--dry-run]
import { prisma } from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';
import { cardKey, isR2ImageUrl, makeCard, R2_SHOES_PREFIX } from '@/lib/shoes/images/store';

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const shoes = await prisma.shoes.findMany({ where: { image_url: { not: null } }, select: { slug: true, image_url: true } });
  let made = 0, bytes = 0;
  const failed: string[] = [];
  for (const s of shoes) {
    const url = s.image_url!;
    const m = isR2ImageUrl(url) ? url.slice(R2_SHOES_PREFIX.length).match(/^([^/]+)\.jpg$/) : null;
    if (!m) continue; // a hotlink: the card falls back to Next's resizer
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const card = await makeCard(Buffer.from(await res.arrayBuffer()));
      if (!dryRun) await uploadToR2(cardKey(m[1]), card, 'image/webp');
      made++; bytes += card.length;
    } catch (e) {
      failed.push(`${s.slug}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`${dryRun ? 'Would make' : 'Made'} ${made} cards, average ${Math.round(bytes / Math.max(made, 1) / 1024)} KB. Failed: ${failed.length}`);
  failed.forEach((f) => console.log('  ' + f));
  await prisma.$disconnect();
})();
