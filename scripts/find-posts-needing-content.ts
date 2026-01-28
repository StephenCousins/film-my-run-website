import prisma from '../src/lib/db';

async function main() {
  // Find all posts
  const posts = await prisma.posts.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      meta: true,
      createdAt: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
  });

  console.log(`\nTotal posts: ${posts.length}\n`);

  // Show posts with short content (stubs)
  console.log('Posts with short content (potential stubs):');
  console.log('============================================\n');

  const stubs = posts.filter(p => (p.content?.length || 0) < 1000);

  for (const post of stubs.slice(0, 20)) {
    const contentLength = post.content?.length || 0;
    const meta = post.meta as Record<string, unknown> | null;
    const metaKeys = meta ? Object.keys(meta) : [];

    console.log(`[${post.id}] ${post.title}`);
    console.log(`    Slug: ${post.slug}`);
    console.log(`    Content length: ${contentLength} chars`);
    console.log(`    Meta keys: ${metaKeys.length > 0 ? metaKeys.join(', ') : 'none'}`);
    console.log('');
  }

  console.log(`\nShowing ${Math.min(20, stubs.length)} of ${stubs.length} stub posts`);

  // Check meta field structure
  console.log('\n\nSample meta field structures:');
  console.log('=============================\n');

  const postsWithMeta = posts.filter(p => p.meta && Object.keys(p.meta as object).length > 0);
  for (const post of postsWithMeta.slice(0, 5)) {
    const meta = post.meta as Record<string, unknown>;
    console.log(`[${post.id}] ${post.title}`);
    console.log(`    Meta: ${JSON.stringify(meta, null, 2).substring(0, 200)}...`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
