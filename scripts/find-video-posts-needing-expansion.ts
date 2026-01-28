import prisma from '../src/lib/db';

async function main() {
  const posts = await prisma.posts.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      meta: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
  });

  console.log(`\nTotal posts: ${posts.length}\n`);

  // Find posts with YouTube videos
  const videoPosts = posts.filter(p => {
    const meta = p.meta as Record<string, unknown> | null;
    return meta && meta.youtubeId;
  });

  console.log(`Posts with YouTube videos: ${videoPosts.length}\n`);

  // Sort by content length to find ones needing expansion
  const sortedByContent = videoPosts.sort((a, b) =>
    (a.content?.length || 0) - (b.content?.length || 0)
  );

  console.log('Video posts sorted by content length (shortest first):');
  console.log('========================================================\n');

  for (const post of sortedByContent.slice(0, 15)) {
    const contentLength = post.content?.length || 0;
    const meta = post.meta as Record<string, unknown>;
    const wordCount = post.content?.split(/\s+/).length || 0;

    console.log(`[${post.id}] ${post.title}`);
    console.log(`    Slug: ${post.slug}`);
    console.log(`    YouTube: ${meta.youtubeId}`);
    console.log(`    Content: ${contentLength} chars (~${wordCount} words)`);
    if (meta.distance) console.log(`    Distance: ${meta.distance}`);
    if (meta.time) console.log(`    Time: ${meta.time}`);
    if (meta.location) console.log(`    Location: ${meta.location}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
