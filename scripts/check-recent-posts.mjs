import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findRecent() {
  // Find posts from 2022-2025 that might be auto-generated
  const posts = await prisma.posts.findMany({
    where: {
      status: 'published',
      post_type: 'post',
      OR: [
        { slug: { contains: '2022' } },
        { slug: { contains: '2023' } },
        { slug: { contains: '2024' } },
        { slug: { contains: '2025' } }
      ]
    },
    select: { slug: true, content: true, created_at: true }
  });

  console.log('Recent posts (2022-2025) needing formatting fixes:');
  console.log('='.repeat(70));

  const needsFixList = [];

  for (const post of posts) {
    const imgCount = (post.content.match(/<img/gi) || []).length;
    if (imgCount === 0) continue;

    const hasRacePhoto = post.content.includes('race-photo');
    const floatCount = (post.content.match(/photo-float/g) || []).length;
    const needsFix = !hasRacePhoto || (imgCount > 1 && floatCount === 0);

    if (needsFix) {
      console.log(`❌ ${post.slug} (${imgCount} images, needs styling)`);
      needsFixList.push(post.slug);
    }
  }

  if (needsFixList.length === 0) {
    console.log('✅ All recent posts are properly styled!');
  } else {
    console.log(`\nTotal needing fixes: ${needsFixList.length}`);
  }

  await prisma.$disconnect();
}

findRecent();
