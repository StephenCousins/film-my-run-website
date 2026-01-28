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
  console.log('Posts with transcripts in meta:');
  console.log('================================\n');

  for (const post of posts) {
    const meta = post.meta as Record<string, unknown> | null;
    const hasTranscript = meta && typeof meta.transcript === 'string' && meta.transcript.length > 100;
    const contentLength = post.content?.length || 0;
    const isStub = contentLength < 500; // Consider posts with less than 500 chars as stubs

    if (hasTranscript) {
      const transcriptLength = (meta.transcript as string).length;
      console.log(`[${post.id}] ${post.title}`);
      console.log(`    Slug: ${post.slug}`);
      console.log(`    Content length: ${contentLength} chars ${isStub ? '(STUB - needs writing)' : '(has content)'}`);
      console.log(`    Transcript length: ${transcriptLength} chars`);
      console.log('');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
