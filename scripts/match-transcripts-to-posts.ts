import prisma from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const TRANSCRIPTS_DIR = path.join(__dirname, '..', 'transcripts');

interface TranscriptFile {
  filename: string;
  date: string;
  raceName: string;
  filePath: string;
  wordCount: number;
}

function parseTranscriptFilename(filename: string): { date: string; raceName: string } | null {
  // Format: DD-MM-YYYY_race-name.txt
  const match = filename.match(/^(\d{2}-\d{2}-\d{4})_(.+)\.txt$/);
  if (!match) return null;

  const [, dateStr, raceSlug] = match;
  const raceName = raceSlug.replace(/-/g, ' ');

  return { date: dateStr, raceName };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

async function main() {
  // Get all transcript files
  const files = fs.readdirSync(TRANSCRIPTS_DIR)
    .filter(f => f.endsWith('.txt') && !f.startsWith('_'));

  const transcripts: TranscriptFile[] = [];

  for (const file of files) {
    const parsed = parseTranscriptFilename(file);
    if (!parsed) continue;

    const filePath = path.join(TRANSCRIPTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    transcripts.push({
      filename: file,
      date: parsed.date,
      raceName: parsed.raceName,
      filePath,
      wordCount: countWords(content),
    });
  }

  console.log(`Found ${transcripts.length} transcript files\n`);

  // Get all posts
  const posts = await prisma.posts.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      publishedAt: true,
    },
  });

  console.log('Matching transcripts to posts...\n');
  console.log('='.repeat(80));

  const needsWriting: { transcript: TranscriptFile; post?: { id: number; title: string; slug: string; contentWords: number } }[] = [];

  for (const transcript of transcripts) {
    // Try to find a matching post
    const matchingPost = posts.find(p => {
      const titleLower = p.title.toLowerCase();
      const raceNameLower = transcript.raceName.toLowerCase();

      // Check if race name is in title
      if (titleLower.includes(raceNameLower)) return true;

      // Check for partial matches
      const raceWords = raceNameLower.split(' ');
      const matchingWords = raceWords.filter(w => w.length > 3 && titleLower.includes(w));
      if (matchingWords.length >= 2) return true;

      return false;
    });

    const postContentWords = matchingPost
      ? matchingPost.content.split(/\s+/).filter(w => w.length > 0).length
      : 0;

    // Determine if this needs writing
    // Consider it needs writing if:
    // - No matching post exists, OR
    // - Post has less than 800 words of content
    const needsContent = !matchingPost || postContentWords < 800;

    if (needsContent) {
      needsWriting.push({
        transcript,
        post: matchingPost ? {
          id: matchingPost.id,
          title: matchingPost.title,
          slug: matchingPost.slug,
          contentWords: postContentWords,
        } : undefined,
      });
    }

    // Log status
    const status = matchingPost
      ? postContentWords < 800
        ? 'NEEDS EXPANSION'
        : 'OK'
      : 'NO POST';

    console.log(`[${status}] ${transcript.raceName}`);
    console.log(`    Transcript: ${transcript.wordCount} words`);
    if (matchingPost) {
      console.log(`    Post ID ${matchingPost.id}: ${matchingPost.title}`);
      console.log(`    Post content: ${postContentWords} words`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`\nSUMMARY:`);
  console.log(`  Total transcripts: ${transcripts.length}`);
  console.log(`  Need writing/expansion: ${needsWriting.length}`);
  console.log('');

  if (needsWriting.length > 0) {
    console.log('Posts that need writing:');
    for (const item of needsWriting) {
      console.log(`  - ${item.transcript.raceName} (${item.transcript.date})`);
      console.log(`    Transcript: ${item.transcript.filename}`);
      if (item.post) {
        console.log(`    Existing post ID: ${item.post.id} (${item.post.contentWords} words)`);
      } else {
        console.log(`    No existing post found`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
