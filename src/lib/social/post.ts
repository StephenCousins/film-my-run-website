// A published news story → a Facebook Page + Instagram post (docs/social-posts.md).
//
// Called after a story is published (runNews once per run, for its newest story with a usable
// photo; news:publish for its story). It never throws:
// whatever happens ends up as one social_posts row (posted, partial, skipped or failed, with
// the reason), which /admin/social lists.
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { claudeCreditSpentThisRun } from '@/lib/llm';
import { uploadToR2 } from '@/lib/r2';
import { cardJpeg, renderCard, type CardInput } from './card';
import { writeSocialCopy, type CopyStory, type SocialCopy } from './copy';
import { metaCredentials, postToFacebook, postToInstagram, verifyAccountLock, type LockResult, type MetaCredentials, type PlatformResult } from './meta';
import { CAP_REACHED, dailyCapReached, londonDayStart, photoProblem } from './rules';
import { isSocialPostingEnabled, setSocialPostingEnabled } from './settings';
import { storyTag } from './tag';

export type SocialStatus = 'posted' | 'partial' | 'skipped' | 'failed';

export interface SocialOutcome {
  status: SocialStatus;
  reason: string | null;
  /** OpenRouter spend (the news ceiling). The Claude key's is in claudeCreditSpentThisRun(). */
  costUsd: number;
}

export interface StoryRow {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: string;
  image_url: string | null;
  photo_credit: string | null;
  image_source_width: number | null;
  topic: string | null;
  importance: number | null;
  published_at: Date | null;
}

type RowUpdate = Partial<{
  status: SocialStatus; reason: string | null; tag: string; headline: string; caption_facebook: string; caption_instagram: string;
  card_url: string | null; facebook_post_id: string; facebook_url: string; instagram_media_id: string; instagram_url: string;
  cost_usd: number; claude_cost_usd: number; posted_at: Date;
}>;

export interface SocialDeps {
  now: () => Date;
  loadStory: (id: number) => Promise<StoryRow | null>;
  /** news_items.verdict.type for the story's feed items. */
  verdictTypes: (storyId: number) => Promise<string[]>;
  /** Makes the story's social_posts row; null if it already has one (never post a story twice). */
  claim: (storyId: number, slug: string) => Promise<number | null>;
  update: (rowId: number, data: RowUpdate) => Promise<void>;
  /** Posts that went out (posted or partial) since this instant. */
  postedSince: (since: Date) => Promise<number>;
  switchOn: () => Promise<boolean>;
  credentials: () => MetaCredentials | null;
  /** The account lock (meta.ts verifyAccountLock): are the IDs and token really Film My Run's? */
  verifyLock: (creds: MetaCredentials) => Promise<LockResult>;
  /** Turns the admin switch off (after an account-lock refusal). */
  disablePosting: () => Promise<void>;
  copy: (s: CopyStory) => Promise<SocialCopy>;
  fetchPhoto: (url: string) => Promise<Buffer>;
  /** The finished card, ready to upload: a 1080x1350 JPEG (Instagram takes JPEG only). */
  render: (c: CardInput) => Promise<Buffer>;
  upload: (key: string, body: Buffer, contentType: string) => Promise<string>;
  facebook: (creds: MetaCredentials, imageUrl: string, caption: string) => Promise<PlatformResult>;
  instagram: (creds: MetaCredentials, imageUrl: string, caption: string) => Promise<PlatformResult>;
}

/** Where the card goes on R2: Meta fetches it from this public URL. JPEG, not PNG: see cardJpeg. */
const cardKey = (slug: string) => `social/${slug}.jpg`;

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 300);

async function fetchPhoto(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`story photo: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export const liveSocialDeps: SocialDeps = {
  now: () => new Date(),
  loadStory: (id) => prisma.news_stories.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true, excerpt: true, content: true, status: true, image_url: true, photo_credit: true, image_source_width: true, topic: true, importance: true, published_at: true },
  }),
  verdictTypes: async (storyId) =>
    (await prisma.news_items.findMany({ where: { story_id: storyId }, select: { verdict: true } }))
      .map((i) => (i.verdict as { type?: string } | null)?.type)
      .filter((t): t is string => typeof t === 'string'),
  claim: async (storyId, slug) => {
    try {
      // Claimed as "failed" first: if the process dies part way, the story is still never posted twice.
      return (await prisma.social_posts.create({ data: { story_id: storyId, slug, status: 'failed', reason: 'interrupted before finishing' } })).id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null;
      throw e;
    }
  },
  update: async (rowId, data) => { await prisma.social_posts.update({ where: { id: rowId }, data }); },
  postedSince: (since) => prisma.social_posts.count({ where: { status: { in: ['posted', 'partial'] }, posted_at: { gte: since } } }),
  switchOn: isSocialPostingEnabled,
  credentials: () => metaCredentials(),
  verifyLock: (c) => verifyAccountLock(c),
  disablePosting: () => setSocialPostingEnabled(false),
  copy: (s) => writeSocialCopy(s),
  fetchPhoto,
  render: async (c) => cardJpeg(await renderCard(c)),
  upload: uploadToR2,
  facebook: (c, url, caption) => postToFacebook(c, url, caption),
  instagram: (c, url, caption) => postToInstagram(c, url, caption),
};

/**
 * The social post for one published story. In order:
 * 1. one row per story (claim): a story already tried is left alone;
 * 2. Stephen's photo rule (photoProblem): no real photo, the branded card, or a source photo
 *    under 1080px wide means no post;
 * 3. the daily cap: 1 post per UK day (SOCIAL_CONFIG.maxPostsPerDay);
 * 4. Claude writes the headline and captions, the card is rendered and stored on R2
 *    (social/<slug>.jpg; Meta needs a public URL, and /admin/social shows it);
 * 5. only if the admin switch is on AND all five Meta settings are present;
 * 6. the account lock: Meta is asked who the Page, the Instagram account and the token really
 *    are. Any mismatch or failed lookup: nothing is posted anywhere, the switch is turned off
 *    (so the rest of the run posts nothing either) and the refusal is recorded;
 * 7. Facebook, then Instagram, each on its own (one can succeed while the other fails).
 * Steps 2 and 3 come before any AI call, so a skip costs nothing.
 */
export async function socialPostForStory(storyId: number, over: Partial<SocialDeps> = {}): Promise<SocialOutcome> {
  const d: SocialDeps = { ...liveSocialDeps, ...over };
  const claudeBefore = claudeCreditSpentThisRun();
  let costUsd = 0;
  let rowId: number | null = null;
  const spend = () => ({ cost_usd: costUsd, claude_cost_usd: Math.max(0, claudeCreditSpentThisRun() - claudeBefore) });
  const finish = async (status: SocialStatus, reason: string | null, data: RowUpdate = {}): Promise<SocialOutcome> => {
    if (rowId !== null) await d.update(rowId, { status, reason, ...data, ...spend() });
    console.log(`social: story ${storyId} ${status}${reason ? ` (${reason})` : ''}`);
    return { status, reason, costUsd };
  };

  try {
    const story = await d.loadStory(storyId);
    if (!story) return await finish('skipped', 'story not found');
    if (story.status !== 'published') return await finish('skipped', `story is ${story.status}, not published`);
    rowId = await d.claim(storyId, story.slug);
    if (rowId === null) return await finish('skipped', 'already has a social post (never posted twice)');

    const photo = photoProblem(story);
    if (photo) return await finish('skipped', photo);
    const now = d.now();
    if (dailyCapReached(await d.postedSince(londonDayStart(now)))) return await finish('skipped', CAP_REACHED);

    const tag = storyTag({
      title: story.title, excerpt: story.excerpt, topic: story.topic, importance: story.importance,
      verdictTypes: await d.verdictTypes(storyId), publishedAt: story.published_at, now,
    });
    const copy = await d.copy({ slug: story.slug, title: story.title, excerpt: story.excerpt, content: story.content, photoCredit: story.photo_credit, topic: story.topic, tag });
    costUsd += copy.costUsd;
    const words = { tag, headline: copy.headline, caption_facebook: copy.captionFacebook, caption_instagram: copy.captionInstagram };
    const card = await d.render({ photo: await d.fetchPhoto(story.image_url!), headline: copy.headline, highlight: copy.highlight, tag, credit: story.photo_credit });

    const creds = d.credentials();
    // Not posting, but the card still goes to R2 so /admin/social can show what would have
    // gone out. A failed upload doesn't matter here.
    const preview = () => d.upload(cardKey(story.slug), card, 'image/jpeg').catch((e) => { console.warn(`social: card preview not stored (${errorText(e)})`); return null; });
    const off = !(await d.switchOn()) ? 'posting switched off' : !creds ? 'Meta settings not set (all five META_ variables are needed)' : null;
    if (off) return await finish('skipped', off, { ...words, card_url: await preview() });

    // The hard account lock, before every post: nothing goes anywhere unless both accounts
    // and the token are Film My Run's.
    const lock: LockResult = await d.verifyLock(creds!).catch((e) => ({ ok: false, reason: `account lock: could not check the accounts (${errorText(e)})` }));
    if (!lock.ok) {
      const switched = await d.disablePosting().then(() => 'posting switched off', (e) => `could not switch posting off (${errorText(e)})`);
      console.error(`social: ${lock.reason}; ${switched}`);
      return await finish('skipped', `${lock.reason}; ${switched}`, { ...words, card_url: await preview() });
    }

    const cardUrl = await d.upload(cardKey(story.slug), card, 'image/jpeg');
    // Saved before posting, so a crash part way still shows the words and card.
    if (rowId !== null) await d.update(rowId, { ...words, card_url: cardUrl });
    const fb = await d.facebook(creds!, cardUrl, copy.captionFacebook).catch((e): PlatformResult => ({ ok: false, error: errorText(e) }));
    const ig = await d.instagram(creds!, cardUrl, copy.captionInstagram).catch((e): PlatformResult => ({ ok: false, error: errorText(e) }));
    const errors = [!fb.ok && `Facebook: ${fb.error}`, !ig.ok && `Instagram: ${ig.error}`].filter(Boolean).join('; ') || null;
    const status: SocialStatus = fb.ok && ig.ok ? 'posted' : fb.ok || ig.ok ? 'partial' : 'failed';
    return await finish(status, errors, {
      ...words, card_url: cardUrl,
      ...(fb.ok ? { facebook_post_id: fb.id, facebook_url: fb.url } : {}),
      ...(ig.ok ? { instagram_media_id: ig.id, instagram_url: ig.url } : {}),
      ...(fb.ok || ig.ok ? { posted_at: d.now() } : {}),
    });
  } catch (e) {
    const reason = `error: ${errorText(e)}`;
    console.error(`social: story ${storyId} failed (${reason})`);
    if (rowId !== null) await d.update(rowId, { status: 'failed', reason, ...spend() }).catch((err) => console.error(`social: could not record the failure (${errorText(err)})`));
    return { status: 'failed', reason, costUsd };
  }
}

/** Is today's (UK day's) post already out? */
export async function socialCapReached(over: Partial<SocialDeps> = {}): Promise<boolean> {
  const d: SocialDeps = { ...liveSocialDeps, ...over };
  return dailyCapReached(await d.postedSince(londonDayStart(d.now())));
}

/**
 * A skipped social_posts row for a story the news run is not posting (planSocialRun): no AI
 * call, no card, nothing sent. A story that already has a row is left alone. Never throws.
 */
export async function recordSocialSkip(story: { id: number; slug: string }, reason: string, over: Partial<SocialDeps> = {}): Promise<SocialOutcome> {
  const d: SocialDeps = { ...liveSocialDeps, ...over };
  try {
    const rowId = await d.claim(story.id, story.slug);
    if (rowId === null) return { status: 'skipped', reason: 'already has a social post (never posted twice)', costUsd: 0 };
    await d.update(rowId, { status: 'skipped', reason, cost_usd: 0, claude_cost_usd: 0 });
    console.log(`social: story ${story.id} skipped (${reason})`);
    return { status: 'skipped', reason, costUsd: 0 };
  } catch (e) {
    const why = `error: ${errorText(e)}`;
    console.error(`social: story ${story.id} skip not recorded (${why})`);
    return { status: 'failed', reason: why, costUsd: 0 };
  }
}
