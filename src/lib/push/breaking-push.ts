// Breaking news push (Stephen, 20 Nov 2026): a story he publishes by hand with news:story is big news, so the app
// gets it at once, not at the next 07:30 push. news:story queues it; the server's 5-minute news-push tick sends it
// (the APNs key lives only on Railway). Never at night: queued after 22:00 it waits for 07:00. A day late is stale.
import { isDeadToken } from './apns';
import { londonClock, type NewsPushDevice, type NewsPushDeps } from './news-push';

export const QUIET_FROM = 22 * 60;
export const QUIET_UNTIL = 7 * 60;
export const MAX_QUEUED_MS = 24 * 60 * 60 * 1000;

export const awake = (now: Date) => { const { minutes } = londonClock(now); return minutes >= QUIET_UNTIL && minutes < QUIET_FROM; };

export function breakingPayload(story: { slug: string; title: string }) {
  return { aps: { alert: { title: 'Running news', body: story.title }, sound: 'default' }, url: `filmmyrun://news/${story.slug}` };
}

export interface BreakingPushDeps {
  now: Date;
  /** The oldest waiting story queued since `since`. */
  next(since: Date): Promise<{ slug: string; title: string } | null>;
  /** Marks it sent; false if another instance already did (the lock). */
  claim(slug: string): Promise<boolean>;
  devices: NewsPushDeps['devices'];
  send(device: NewsPushDevice, payload: ReturnType<typeof breakingPayload>, opts: { expiration: number }): ReturnType<NewsPushDeps['send']>;
  markDead: NewsPushDeps['markDead'];
  record(slug: string, recipients: number, failures: number): Promise<void>;
  finish?(): void;
}

export async function runBreakingPush(deps: BreakingPushDeps) {
  if (!awake(deps.now)) return { outcome: 'quiet-hours' as const };
  const story = await deps.next(new Date(deps.now.getTime() - MAX_QUEUED_MS));
  if (!story) return { outcome: 'nothing-queued' as const };
  if (!(await deps.claim(story.slug))) return { outcome: 'claimed-elsewhere' as const, slug: story.slug };
  const devices = await deps.devices();
  const payload = breakingPayload(story);
  const expiration = Math.floor(deps.now.getTime() / 1000) + 6 * 3600;   // a phone off all day doesn't get it tomorrow
  let failures = 0;
  try {
    for (const device of devices) {
      try {
        const res = await deps.send(device, payload, { expiration });
        if (res.status !== 200) failures++;
        if (isDeadToken(res.status, res.reason)) await deps.markDead(device.token);
      } catch { failures++; }
    }
  } finally { deps.finish?.(); }
  await deps.record(story.slug, devices.length, failures);
  return { outcome: 'sent' as const, slug: story.slug, recipients: devices.length, failures };
}

/** The live deps: the shared device list and APNs sessions from the morning push. */
export async function prismaBreakingPushDeps(news: NewsPushDeps): Promise<BreakingPushDeps> {
  const { prisma } = await import('@/lib/db');
  return {
    now: news.now,
    next: (since) => prisma.news_breaking_pushes.findFirst({
      where: { sent_at: null, queued_at: { gte: since } }, orderBy: { queued_at: 'asc' }, select: { slug: true, title: true },
    }),
    claim: async (slug) => (await prisma.news_breaking_pushes.updateMany({ where: { slug, sent_at: null }, data: { sent_at: new Date() } })).count === 1,
    devices: news.devices,
    send: (d, payload, opts) => news.send(d, payload as never, opts),
    markDead: news.markDead,
    record: async (slug, recipients, failures) => { await prisma.news_breaking_pushes.update({ where: { slug }, data: { recipients, failures } }); },
    finish: news.finish,
  };
}

/** news:story calls this after publishing. Same slug twice is a no-op. */
export async function queueBreakingPush(story: { slug: string; title: string }) {
  const { prisma } = await import('@/lib/db');
  await prisma.news_breaking_pushes.upsert({ where: { slug: story.slug }, create: story, update: {} });
}
