import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findPosts() {
  const posts = await prisma.posts.findMany({
    where: {
      status: 'published',
      post_type: 'post'
    },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true
    },
    orderBy: { created_at: 'desc' }
  });

  const needsStyling = posts.filter(p => {
    const content = p.content || '';
    const imgCount = (content.match(/<img/g) || []).length;
    const hasProperStyling = (content.match(/photo-float/g) || []).length >= 2;

    // Only posts with 3+ images that don't have proper styling
    return imgCount >= 3 && !hasProperStyling;
  });

  console.log(JSON.stringify(needsStyling.map(p => ({
    slug: p.slug,
    imgCount: (p.content.match(/<img/g) || []).length
  })), null, 2));

  await prisma.$disconnect();
}

findPosts();
