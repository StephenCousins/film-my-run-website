import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const MIN_WORDS = 500; // Posts with fewer words need content

function extractYouTubeIds(content: string): string[] {
  const ids: string[] = [];

  const embedMatches = content.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g) || [];
  for (const m of embedMatches) {
    const id = m.replace('youtube.com/embed/', '');
    if (id) ids.push(id);
  }

  const shortMatches = content.match(/youtu\.be\/([a-zA-Z0-9_-]+)/g) || [];
  for (const m of shortMatches) {
    const id = m.replace('youtu.be/', '');
    if (id) ids.push(id);
  }

  const watchMatches = content.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g) || [];
  for (const m of watchMatches) {
    const id = m.replace('youtube.com/watch?v=', '');
    if (id) ids.push(id);
  }

  return [...new Set(ids)];
}

function countWords(text: string): number {
  const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.split(' ').filter(w => w.length > 0).length;
}

async function main() {
  const transcriptsDir = path.join(__dirname, '..', 'transcripts');

  // Get existing transcript YouTube IDs
  const transcriptFiles = fs.readdirSync(transcriptsDir)
    .filter(f => f.endsWith('.txt') && f.startsWith('_') === false);

  const transcriptYoutubeIds = new Set<string>();
  for (const file of transcriptFiles) {
    const content = fs.readFileSync(path.join(transcriptsDir, file), 'utf-8');
    for (const id of extractYouTubeIds(content)) {
      transcriptYoutubeIds.add(id);
    }
  }

  // Get all posts
  const posts = await prisma.posts.findMany({
    select: { id: true, title: true, slug: true, content: true, meta: true, published_at: true }
  });

  // Find posts that: have video, need content (<500 words), AND don't have transcript
  const needsWork: { id: number; title: string; wordCount: number; youtubeId: string; date: string }[] = [];

  for (const p of posts) {
    const youtubeIds: string[] = [];

    if (p.meta && (p.meta as any).youtubeId) {
      youtubeIds.push((p.meta as any).youtubeId);
    }

    if (p.content) {
      youtubeIds.push(...extractYouTubeIds(p.content));
    }

    const uniqueIds = [...new Set(youtubeIds)];
    if (uniqueIds.length === 0) continue;

    const wordCount = p.content ? countWords(p.content) : 0;
    if (wordCount >= MIN_WORDS) continue; // Already has good content

    // Check if any video lacks transcript
    for (const ytId of uniqueIds) {
      if (transcriptYoutubeIds.has(ytId) === false) {
        needsWork.push({
          id: p.id,
          title: p.title,
          wordCount,
          youtubeId: ytId,
          date: p.published_at ? new Date(p.published_at).toISOString().split('T')[0] : 'no date'
        });
        break; // Only count post once
      }
    }
  }

  // Sort by date descending
  needsWork.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`=== POSTS NEEDING CONTENT + TRANSCRIPTS (${needsWork.length}) ===\n`);
  for (const p of needsWork) {
    console.log(`[${p.id}] ${p.title}`);
    console.log(`    Date: ${p.date} | Current words: ${p.wordCount}`);
    console.log(`    YouTube: https://youtube.com/watch?v=${p.youtubeId}`);
    console.log('');
  }

  console.log(`Summary:`);
  console.log(`  Posts with videos needing content AND transcripts: ${needsWork.length}`);
  console.log(`  (Posts with ${MIN_WORDS}+ words already written are excluded)`);
}

main().finally(() => prisma.$disconnect());
