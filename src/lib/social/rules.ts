// The social step's safety rules, as pure functions (tested in rules.test.ts).
import { londonMidnight } from '@/lib/news/daily-run';
import { londonClock } from '@/lib/push/news-push';

export const SOCIAL_CONFIG = {
  /** Instagram's portrait card; also what the source photo must be at least this wide for (Stephen). */
  minPhotoWidth: 1080,
  /** Posts (posted or partly posted) per UK calendar day, Europe/London. */
  maxPostsPerDay: 3,
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
