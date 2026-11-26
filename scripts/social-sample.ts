// Social cards and captions for sample stories, to look at before anything is posted.
// No database, no R2, no Meta: the real copy (Claude) and card code, written to a folder.
//
// Run:  npm run social:sample -- <stories.json> <output dir> [--no-ai]
//       --no-ai: no Claude; the title is the headline and the excerpt the caption (to check the card alone).
//
// stories.json: [{ "slug", "title", "excerpt", "content", "image_url", "photo_credit", "topic", "importance", "tag"? }]
// image_url may be a web address or a local file. "tag" (BREAKING, RESULTS, RACE NEWS, ULTRA) overrides storyTag().
// Writes <slug>.png and <slug>.txt (headline, tag, both captions) per story.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { claudeCreditSpentThisRun } from '@/lib/llm';
import { renderCard } from '@/lib/social/card';
import { buildCaptions, cleanHashtags, writeSocialCopy, type SocialCopy } from '@/lib/social/copy';
import { SOCIAL_TAGS, storyTag, type SocialTag } from '@/lib/social/tag';

interface SampleStory {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  photo_credit: string | null;
  topic?: string | null;
  importance?: number | null;
  tag?: SocialTag;
}

async function readImage(src: string): Promise<Buffer> {
  if (!/^https?:\/\//.test(src)) return readFile(src);
  const res = await fetch(src, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`image: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** --no-ai: the story's own title and excerpt, through the same caption builder. */
function plainCopy(s: SampleStory): SocialCopy {
  const hashtags = cleanHashtags([], s.topic);
  const c = buildCaptions(s.excerpt, s.slug, s.photo_credit, hashtags);
  return { headline: s.title, highlight: [], captionFacebook: c.facebook, captionInstagram: c.instagram, hashtags, costUsd: 0 };
}

(async () => {
  const noAi = process.argv.includes('--no-ai');
  const [file, outDir] = process.argv.slice(2).filter((a) => a !== '--no-ai');
  if (!file || !outDir) throw new Error('Usage: npm run social:sample -- <stories.json> <output dir> [--no-ai]');
  const stories = JSON.parse(await readFile(file, 'utf8')) as SampleStory[];
  await mkdir(outDir, { recursive: true });
  let openRouter = 0;
  for (const s of stories) {
    try {
      const tag = s.tag && SOCIAL_TAGS.includes(s.tag) ? s.tag : storyTag({ title: s.title, excerpt: s.excerpt, topic: s.topic, importance: s.importance });
      const copy = noAi ? plainCopy(s) : await writeSocialCopy({ slug: s.slug, title: s.title, excerpt: s.excerpt, content: s.content, photoCredit: s.photo_credit, topic: s.topic, tag });
      openRouter += copy.costUsd;
      const card = await renderCard({ photo: await readImage(s.image_url), headline: copy.headline, highlight: copy.highlight, tag, credit: s.photo_credit });
      await writeFile(path.join(outDir, `${s.slug}.png`), card);
      await writeFile(
        path.join(outDir, `${s.slug}.txt`),
        `Headline: ${copy.headline}\nHighlight: ${copy.highlight.join(', ')}\nTag: ${tag}\n\n--- Facebook ---\n${copy.captionFacebook}\n\n--- Instagram ---\n${copy.captionInstagram}\n`,
      );
      console.log(`${s.slug}: ${tag} | ${copy.headline}`);
    } catch (e) {
      console.error(`${s.slug}: FAILED ${(e as Error).message}`);
    }
  }
  console.log(`Done: ${outDir}. OpenRouter $${openRouter.toFixed(3)}, Claude API credit $${claudeCreditSpentThisRun().toFixed(3)}.`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
