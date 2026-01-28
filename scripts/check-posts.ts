import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get posts 210-222
  const posts = await prisma.posts.findMany({
    where: {
      id: {
        gte: 210,
        lte: 222
      }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featured_image: true,
      published_at: true
    },
    orderBy: { id: 'asc' }
  });

  console.log('Posts 210-222:');
  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
