import type { AppNewsStory } from '@/lib/app-api/news';
import { isDeadToken, sendApns, type ApnsConfig, type ApnsEnvironment } from './apns';

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

export interface NewsPushDevice { token: string; environment: ApnsEnvironment }
export interface NewsPushDeps {
  now: Date;
  dryRun?: boolean;
  feed(): Promise<AppNewsStory[]>;
  lastSentSlug(): Promise<string | null>;
  alreadySent(day: string): Promise<boolean>;
  /** Inserts the day's row; false if it already existed (another instance claimed it). */
  claim(day: string, slug: string): Promise<boolean>;
  devices(): Promise<NewsPushDevice[]>;
  send(device: NewsPushDevice, payload: ReturnType<typeof newsPayload>): Promise<{ status: number; reason?: string }>;
  markDead(token: string): Promise<void>;
  record(day: string, recipients: number, failures: number): Promise<void>;
}
export interface NewsPushResult {
  outcome: 'outside-window' | 'already-sent' | 'no-new-story' | 'claimed-elsewhere' | 'sent' | 'dry-run';
  slug?: string;
  recipients?: number;
  failures?: number;
}

export async function runNewsPush(deps: NewsPushDeps): Promise<NewsPushResult> {
  if (!inSendWindow(deps.now)) return { outcome: 'outside-window' };
  const { day } = londonClock(deps.now);
  if (await deps.alreadySent(day)) return { outcome: 'already-sent' };
  const story = pickStory(await deps.feed(), await deps.lastSentSlug());
  if (!story) return { outcome: 'no-new-story' };
  const devices = await deps.devices();
  if (deps.dryRun) return { outcome: 'dry-run', slug: story.slug, recipients: devices.length };
  if (!(await deps.claim(day, story.slug))) return { outcome: 'claimed-elsewhere', slug: story.slug };

  const payload = newsPayload(story);
  let failures = 0;
  for (const device of devices) {
    try {
      const res = await deps.send(device, payload);
      if (res.status !== 200) failures++;
      if (isDeadToken(res.status, res.reason)) await deps.markDead(device.token);
    } catch {
      failures++;
    }
  }
  await deps.record(day, devices.length, failures);
  return { outcome: 'sent', slug: story.slug, recipients: devices.length, failures };
}

export async function prismaNewsPushDeps(now: Date, config: ApnsConfig, dryRun = false): Promise<NewsPushDeps> {
  const [{ prisma }, { latestPublishedStories }] = await Promise.all([import('@/lib/db'), import('@/lib/app-api/news')]);
  return {
    now,
    dryRun,
    feed: () => latestPublishedStories(now),
    lastSentSlug: async () => (await prisma.news_push_sends.findFirst({ orderBy: { day: 'desc' }, select: { slug: true } }))?.slug ?? null,
    alreadySent: async (day) => (await prisma.news_push_sends.findUnique({ where: { day } })) !== null,
    claim: async (day, slug) => {
      try {
        await prisma.news_push_sends.create({ data: { day, slug } });
        return true;
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') return false;
        throw e;
      }
    },
    devices: async () =>
      (await prisma.push_devices.findMany({ where: { news: true, invalid_at: null }, select: { token: true, environment: true } })) as NewsPushDevice[],
    send: (device, payload) => sendApns(config, { token: device.token, environment: device.environment, payload }),
    markDead: async (token) => { await prisma.push_devices.update({ where: { token }, data: { invalid_at: new Date() } }); },
    record: async (day, recipients, failures) => { await prisma.news_push_sends.update({ where: { day }, data: { recipients, failures } }); },
  };
}
