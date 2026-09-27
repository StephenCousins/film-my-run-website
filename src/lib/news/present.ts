/** Flip to true at go-live (Task 12): /news then shows only our stories. */
export const NEWS_PAGE_OURS_ONLY = true;

export const TOPIC_LABELS: Record<string, string> = { trail_ultra: 'Trail & Ultra', road: 'Road', track: 'Track' };

export function storyTags(topic: string | null, isUk: boolean): string[] {
  return [TOPIC_LABELS[topic ?? 'trail_ultra'] ?? 'Trail & Ultra', ...(isUk ? ['UK'] : [])];
}

/** How long a story can stay as the page's top story. */
export const TOP_STORY_DAYS = 3;

/**
 * The /news order: the biggest story of the last three days first, marked as
 * the top story (a tie goes to the newer), then everything else newest first.
 * The newest story used to lead however small it was (Stephen, 27 Sep 2026:
 * "we need to prioritise the big stories").
 */
export function orderForPage<T extends { importance: number; pubDate: string }>(stories: T[], now: Date): (T & { topStory?: boolean })[] {
  const newest = [...stories].sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  const since = now.getTime() - TOP_STORY_DAYS * 86_400_000;
  const top = newest.filter((s) => Date.parse(s.pubDate) >= since).reduce<T | null>((best, s) => (!best || s.importance > best.importance ? s : best), null);
  return top ? [{ ...top, topStory: true }, ...newest.filter((s) => s !== top)] : newest;
}
