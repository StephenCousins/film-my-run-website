import prisma from '../src/lib/db';

async function cleanup() {
  // 1. Delete all Runner's World UK articles
  const rwDeleted = await prisma.articles.deleteMany({
    where: { source: "Runner's World UK" }
  });
  console.log('Deleted Runner\'s World UK:', rwDeleted.count);

  // 2. Get remaining articles and find duplicates
  const articles = await prisma.articles.findMany({
    select: { id: true, guid: true, title: true, image_url: true, source: true },
    orderBy: { id: 'asc' }
  });

  const byTitle: Record<string, typeof articles> = {};
  for (const a of articles) {
    const key = a.source + '|' + a.title;
    if (byTitle[key] === undefined) byTitle[key] = [];
    byTitle[key].push(a);
  }

  const toDelete: number[] = [];

  for (const [_, arr] of Object.entries(byTitle)) {
    if (arr.length > 1) {
      // Keep the first one with an image, or just the first one
      const withImage = arr.filter(a => a.image_url);
      const keeper = withImage.length > 0 ? withImage[0] : arr[0];

      for (const a of arr) {
        if (a.id !== keeper.id) {
          toDelete.push(a.id);
        }
      }
    }
  }

  console.log('Deleting', toDelete.length, 'duplicates:', toDelete);

  if (toDelete.length > 0) {
    await prisma.articles.deleteMany({
      where: { id: { in: toDelete } }
    });
  }

  // Final count
  const remaining = await prisma.articles.count();
  console.log('Remaining articles:', remaining);
}

cleanup().catch(console.error);
