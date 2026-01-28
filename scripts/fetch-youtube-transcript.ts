import { YoutubeTranscript } from 'youtube-transcript';
import prisma from '../src/lib/db';

interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

async function fetchTranscript(youtubeId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(youtubeId);
    // Combine all text segments
    return transcript.map((item: TranscriptItem) => item.text).join(' ');
  } catch (error) {
    console.error(`Failed to fetch transcript for ${youtubeId}:`, error);
    return null;
  }
}

async function main() {
  const postId = process.argv[2];

  if (!postId) {
    console.log('Usage: npx tsx scripts/fetch-youtube-transcript.ts <post-id>');
    console.log('\nFetching list of posts with YouTube videos...\n');

    const posts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        meta: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    const videoPosts = posts.filter(p => {
      const meta = p.meta as Record<string, unknown> | null;
      return meta && meta.youtubeId;
    });

    for (const post of videoPosts) {
      const meta = post.meta as Record<string, unknown>;
      console.log(`[${post.id}] ${post.title}`);
      console.log(`    YouTube: https://youtube.com/watch?v=${meta.youtubeId}`);
      console.log('');
    }

    return;
  }

  // Fetch specific post
  const post = await prisma.post.findUnique({
    where: { id: parseInt(postId) },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      meta: true,
    },
  });

  if (!post) {
    console.error(`Post ${postId} not found`);
    return;
  }

  const meta = post.meta as Record<string, unknown> | null;
  if (!meta?.youtubeId) {
    console.error(`Post ${postId} does not have a YouTube video`);
    return;
  }

  console.log(`\nFetching transcript for: ${post.title}`);
  console.log(`YouTube ID: ${meta.youtubeId}\n`);

  const transcript = await fetchTranscript(meta.youtubeId as string);

  if (transcript) {
    console.log('='.repeat(60));
    console.log('TRANSCRIPT');
    console.log('='.repeat(60));
    console.log(transcript);
    console.log('\n' + '='.repeat(60));
    console.log(`Length: ${transcript.length} characters`);
    console.log(`Words: ~${transcript.split(/\s+/).length}`);
  } else {
    console.log('No transcript available for this video');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
