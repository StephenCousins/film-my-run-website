import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PostUpdate {
  id: number;
  content: string;
  excerpt?: string;
}

async function updatePost(update: PostUpdate) {
  const result = await prisma.posts.update({
    where: { id: update.id },
    data: {
      content: update.content,
      ...(update.excerpt && { excerpt: update.excerpt }),
      updated_at: new Date()
    }
  });
  console.log(`Updated post ${result.id}: ${result.title}`);
  return result;
}

// Export for use by other scripts
export { updatePost, PostUpdate };

// If run directly with JSON input
async function main() {
  const input = process.argv[2];
  if (!input) {
    console.log('Usage: npx tsx update-post.ts \'{"id": 210, "content": "..."}\'');
    return;
  }

  try {
    const update: PostUpdate = JSON.parse(input);
    await updatePost(update);
  } catch (e) {
    console.error('Error:', e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
