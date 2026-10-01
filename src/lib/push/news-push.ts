import type { AppNewsStory } from '@/lib/app-api/news';
import { isDeadToken, openApns, type ApnsConfig, type ApnsSession, type ApnsEnvironment } from './apns';

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

/** Unix seconds of 11:00 London on the given London day (YYYY-MM-DD), correct across BST/GMT. */
export function cutoffUnix(day: string): number {
  for (const h of [10, 11]) {
    const t = new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`);
    const c = londonClock(t);
    if (c.day === day && c.minutes === SEND_UNTIL) return t.getTime() / 1000;
  }
  throw new Error(`no 11:00 London instant for ${day}`);
}

/** The feed's first story, unless it is the one already pushed. */
/** A story older than this is not "today's" news: on a quiet day nothing is sent (Stephen, 1 Oct 2026). */
export const MAX_STORY_AGE_MS = 36 * 60 * 60 * 1000;

export function pickStory(feed: AppNewsStory[], lastSlug: string | null, now: Date): AppNewsStory | null {
  const top = feed[0];
  if (!top || top.slug === lastSlug) return null;
  const published = Date.parse(top.publishedAt);
  return now.getTime() - published <= MAX_STORY_AGE_MS ? top : null;
}

export function newsPayload(story: Pick<AppNewsStory, 'slug' | 'title'>) {
  return { aps: { alert: { title: "Today's running news", body: story.title }, sound: 'default' }, url: `filmmyrun://news/${story.slug}` };
}

export interface NewsPushDevice { token: string; environment: ApnsEnvironment }
export interface NewsPushDeps {
  now: Date;
  /** Clock for the mid-loop cutoff check; defaults to the real time. */
  clock?: () => Date;
  dryRun?: boolean;
  feed(): Promise<AppNewsStory[]>;
  lastSentSlug(): Promise<string | null>;
  alreadySent(day: string): Promise<boolean>;
  /** Inserts the day's row; false if it already existed (another instance claimed it). */
  claim(day: string, slug: string, recipients: number): Promise<boolean>;
  devices(): Promise<NewsPushDevice[]>;
  send(device: NewsPushDevice, payload: ReturnType<typeof newsPayload>, opts: { expiration: number }): Promise<{ status: number; reason?: string }>;
  /** Called once when the run is over, to close connections. */
  finish?(): void;
  /** Called when most sends failed. No tokens in the details. */
  alert?(message: string, details: { day: string; recipients: number; failures: number; firstReason?: string }): void;
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
  const story = pickStory(await deps.feed(), await deps.lastSentSlug(), deps.now);
  if (!story) return { outcome: 'no-new-story' };
  const devices = await deps.devices();
  if (deps.dryRun) return { outcome: 'dry-run', slug: story.slug, recipients: devices.length };
  if (!(await deps.claim(day, story.slug, devices.length))) return { outcome: 'claimed-elsewhere', slug: story.slug };

  const payload = newsPayload(story);
  const expiration = cutoffUnix(day);
  const clock = deps.clock ?? (() => new Date());
  let failures = 0;
  let firstReason: string | undefined;
  try {
    for (const [i, device] of devices.entries()) {
      if (!inSendWindow(clock())) { // past 11:00: the rest would arrive too late to be news
        failures += devices.length - i;
        firstReason ??= 'window-closed';
        break;
      }
      try {
        const res = await deps.send(device, payload, { expiration });
        if (res.status !== 200) { failures++; firstReason ??= res.reason ?? `status ${res.status}`; }
        if (isDeadToken(res.status, res.reason)) await deps.markDead(device.token);
      } catch (e) {
        failures++;
        firstReason ??= e instanceof Error ? e.message : 'error';
      }
    }
  } finally {
    deps.finish?.();
  }
  await deps.record(day, devices.length, failures);
  if (devices.length >= 1 && failures > devices.length / 2) {
    deps.alert?.('[news-push] most sends failed', { day, recipients: devices.length, failures, firstReason });
  }
  return { outcome: 'sent', slug: story.slug, recipients: devices.length, failures };
}

export async function prismaNewsPushDeps(now: Date, config: ApnsConfig, dryRun = false): Promise<NewsPushDeps> {
  const [{ prisma }, { latestPublishedStories }] = await Promise.all([import('@/lib/db'), import('@/lib/app-api/news')]);
  const sessions = new Map<ApnsEnvironment, ApnsSession>();
  return {
    now,
    dryRun,
    feed: () => latestPublishedStories(now),
    lastSentSlug: async () => (await prisma.news_push_sends.findFirst({ orderBy: { day: 'desc' }, select: { slug: true } }))?.slug ?? null,
    alreadySent: async (day) => (await prisma.news_push_sends.findUnique({ where: { day } })) !== null,
    claim: async (day, slug, recipients) => {
      try {
        await prisma.news_push_sends.create({ data: { day, slug, recipients } });
        return true;
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') return false;
        throw e;
      }
    },
    devices: async () =>
      (await prisma.push_devices.findMany({ where: { news: true, invalid_at: null }, select: { token: true, environment: true } })) as NewsPushDevice[],
    send: (device, payload, opts) => {
      let s = sessions.get(device.environment);
      if (!s) { s = openApns(config, device.environment); sessions.set(device.environment, s); }
      return s.send(device.token, payload, opts);
    },
    finish: () => { for (const s of sessions.values()) s.close(); sessions.clear(); },
    markDead: async (token) => { await prisma.push_devices.update({ where: { token }, data: { invalid_at: new Date() } }); },
    record: async (day, recipients, failures) => { await prisma.news_push_sends.update({ where: { day }, data: { recipients, failures } }); },
  };
}
