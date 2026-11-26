// The social step's safety rules, as pure functions (tested in rules.test.ts).
import { londonMidnight } from '@/lib/news/daily-run';
import { londonClock } from '@/lib/push/news-push';

export const SOCIAL_CONFIG = {
  /** Instagram's portrait card; also what the source photo must be at least this wide for (Stephen). */
  minPhotoWidth: 1080,
  /**
   * Posts (posted or partly posted) per UK calendar day, Europe/London. One a day, and a day
   * with no suitable story posts nothing (Stephen, 26 Nov 2026).
   */
  maxPostsPerDay: 1,
  /** settings.key of the admin on/off switch; missing means off. */
  switchKey: 'social_posting_enabled',
} as const;

/** The bits of a news_stories row the photo rule needs. */
export interface PhotoFacts {
  image_url: string | null;
  photo_credit: string | null;
  image_source_width: number | null;
}

/**
 * Why this story's photo can't go on a social card, or null when it can (Stephen: no real
 * photo, or an unusable one, means no post).
 * - No image at all: "no photo".
 * - The branded fallback card (storyImage found no usable source photo, or news:publish put a
 *   held story out with the card): photo_credit is null for both, so "branded fallback".
 * - The source photo was under 1080px wide, or its width wasn't recorded (stories from before
 *   image_source_width existed): "photo too small". The stored copy is always 1200x675, so
 *   only the original width tells us anything.
 */
export function photoProblem(s: PhotoFacts): string | null {
  if (!s.image_url) return 'no photo';
  if (!s.photo_credit) return 'branded fallback';
  if (s.image_source_width == null) return 'photo too small (source width unknown)';
  if (s.image_source_width < SOCIAL_CONFIG.minPhotoWidth) return `photo too small (${s.image_source_width}px wide, needs ${SOCIAL_CONFIG.minPhotoWidth})`;
  return null;
}

/** When today began in the UK (Europe/London), as a UTC instant: the daily cap's window. */
export function londonDayStart(now: Date): Date {
  return londonMidnight(londonClock(now).day);
}

/** Is the day's cap used up, given how many posts went out since londonDayStart? */
export function dailyCapReached(postedToday: number): boolean {
  return postedToday >= SOCIAL_CONFIG.maxPostsPerDay;
}

/** A settings value as the switch: on only when it is exactly true (or { enabled: true }). */
export function switchIsOn(value: unknown): boolean {
  if (value === true) return true;
  return typeof value === 'object' && value !== null && (value as { enabled?: unknown }).enabled === true;
}

/** The skip reasons for the news run's other stories (planSocialRun). */
export const NOT_CHOSEN = 'not chosen today';
export const CAP_REACHED = 'daily cap reached';

/** A story the news run has just published, as the social step needs it. */
export interface SocialChoice extends PhotoFacts {
  id: number;
  slug: string;
  importance: number | null;
  published_at: Date | null;
}

export interface SocialPlan {
  /** The one story to post (socialPostForStory), or null. */
  post: SocialChoice | null;
  /** Every other story, with why it isn't posted (recorded as a skipped row, at no cost). */
  skip: { story: SocialChoice; reason: string }[];
}

/**
 * One news run's stories → at most one post: the newest with a usable photo (published_at,
 * then higher importance). The rest are skipped with their photo problem, `not chosen today`,
 * or `daily cap reached` when today's post has already gone out (an earlier news:publish).
 */
export function planSocialRun(stories: SocialChoice[], capReached: boolean): SocialPlan {
  const skip: SocialPlan['skip'] = [];
  const eligible: SocialChoice[] = [];
  for (const s of stories) {
    const problem = photoProblem(s);
    if (problem) skip.push({ story: s, reason: problem });
    else eligible.push(s);
  }
  const time = (s: SocialChoice) => s.published_at?.getTime() ?? -Infinity;
  eligible.sort((a, b) => time(b) - time(a) || (b.importance ?? 0) - (a.importance ?? 0));
  const post = capReached ? null : eligible[0] ?? null;
  for (const s of eligible) if (s !== post) skip.push({ story: s, reason: capReached ? CAP_REACHED : NOT_CHOSEN });
  return { post, skip };
}

/**
 * A skip that is expected and harmless: no usable photo, not chosen, or today's post already
 * out. The news-run email leaves these out (a quiet day is fine); /admin/social still lists them.
 */
export function isQuietSkip(status: string, reason: string | null | undefined): boolean {
  if (status !== 'skipped' || !reason) return false;
  return ['no photo', 'branded fallback', CAP_REACHED, NOT_CHOSEN].includes(reason) || reason.startsWith('photo too small');
}
