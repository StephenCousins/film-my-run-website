import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const postId = parseInt(process.argv[2] || '210');

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      content: true
    }
  });

  if (post) {
    console.log(`=== Post ${post.id}: ${post.title} ===\n`);
    console.log(post.content);
  } else {
    console.log('Post not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
