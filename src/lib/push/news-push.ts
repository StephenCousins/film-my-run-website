import type { AppNewsStory } from '@/lib/app-api/news';

export const SEND_FROM = 7 * 60 + 30;
export const SEND_UNTIL = 11 * 60;

/** The London calendar day and minutes past midnight, correct across BST/GMT. */
export function londonClock(now: Date): { day: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function inSendWindow(now: Date): boolean {
  const { minutes } = londonClock(now);
  return minutes >= SEND_FROM && minutes < SEND_UNTIL;
}

/** The feed's first story, unless it is the one already pushed. */
export function pickStory(feed: AppNewsStory[], lastSlug: string | null): AppNewsStory | null {
  const top = feed[0];
  return top && top.slug !== lastSlug ? top : null;
}

export function newsPayload(story: Pick<AppNewsStory, 'slug' | 'title'>) {
  return { aps: { alert: { title: "Today's running news", body: story.title }, sound: 'default' }, url: `filmmyrun://news/${story.slug}` };
}
