/** Flip to true at go-live (Task 12): /news then shows only our stories. */
export const NEWS_PAGE_OURS_ONLY = false;

export const TOPIC_LABELS: Record<string, string> = { trail_ultra: 'Trail & Ultra', road: 'Road', track: 'Track' };

export function storyTags(topic: string | null, isUk: boolean): string[] {
  return [TOPIC_LABELS[topic ?? 'trail_ultra'] ?? 'Trail & Ultra', ...(isUk ? ['UK'] : [])];
}
