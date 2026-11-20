// Go-live push: zwift.run's /api/live says when Stephen is live; the server's 60-second tick (instrumentation.ts)
// pushes "Stephen's live now" to devices registered with live = true. Inserting the live_pushes row is the lock.
import { isDeadToken } from './apns';
import type { NewsPushDevice, NewsPushDeps } from './news-push';

const MIN = 60_000;

// Copied from zwift-run-website src/lib/live-push.ts and must stay in step with it.
/** Push only a stream that is live, started 30 min ago or less, with no live push in the previous 60 min. */
export function shouldPush(stream: { status: string; startedAt: Date | null }, lastPushAt: Date | null, now: Date): boolean {
  if (stream.status !== 'live' || !stream.startedAt) return false;
  if (now.getTime() - stream.startedAt.getTime() > 30 * MIN) return false;
  return !lastPushAt || now.getTime() - lastPushAt.getTime() > 60 * MIN;
}

export const LIVE_FEED_URL = 'https://zwift.run/api/live';

export interface LiveFeed { live: { id: string; title: string; at: string } | null; next: unknown; recent: unknown[] }

export function livePayload(s: { id: string; title: string }) {
  return { aps: { alert: { title: "Stephen's live now", body: s.title }, sound: 'default' }, url: 'filmmyrun://live' };
}

export interface LivePushDeps {
  now: Date;
  /** null when the feed can't be read. */
  feed(): Promise<LiveFeed | null>;
  lastSentAt(): Promise<Date | null>;
  /** Inserts the stream's row; false if it already existed (the lock). */
  claim(id: string, title: string): Promise<boolean>;
  devices: NewsPushDeps['devices'];
  send(device: NewsPushDevice, payload: ReturnType<typeof livePayload>, opts: { expiration: number }): ReturnType<NewsPushDeps['send']>;
  markDead: NewsPushDeps['markDead'];
  record(id: string, recipients: number, failures: number): Promise<void>;
  finish?(): void;
}

export async function runLivePush(deps: LivePushDeps) {
  const feed = await deps.feed();
  if (!feed) return { outcome: 'feed-unavailable' as const };
  if (!feed.live) return { outcome: 'not-live' as const };
  const { id, title, at } = feed.live;
  if (!shouldPush({ status: 'live', startedAt: new Date(at) }, await deps.lastSentAt(), deps.now)) return { outcome: 'not-due' as const };
  if (!(await deps.claim(id, title))) return { outcome: 'claimed-elsewhere' as const, id };
  const devices = await deps.devices();
  const payload = livePayload({ id, title });
  const expiration = Math.floor(deps.now.getTime() / 1000) + 2 * 3600;
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
  await deps.record(id, devices.length, failures);
  return { outcome: 'sent' as const, id, recipients: devices.length, failures };
}

/** The live deps: the shared APNs sessions and dead-token marking from the news push, plus the live feed and tables. */
export async function prismaLivePushDeps(news: NewsPushDeps): Promise<LivePushDeps> {
  const { prisma } = await import('@/lib/db');
  return {
    now: news.now,
    feed: async () => {
      try {
        const res = await fetch(LIVE_FEED_URL, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
        return res.ok ? ((await res.json()) as LiveFeed) : null;
      } catch { return null; }
    },
    lastSentAt: async () => (await prisma.live_pushes.findFirst({ orderBy: { sent_at: 'desc' }, select: { sent_at: true } }))?.sent_at ?? null,
    claim: async (id, title) => {
      try {
        await prisma.live_pushes.create({ data: { video_id: id, title } });
        return true;
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002') return false;
        throw e;
      }
    },
    devices: async () =>
      (await prisma.push_devices.findMany({ where: { live: true, invalid_at: null }, select: { token: true, environment: true } })) as NewsPushDevice[],
    send: (d, payload, opts) => news.send(d, payload as never, opts),
    markDead: news.markDead,
    record: async (id, recipients, failures) => { await prisma.live_pushes.update({ where: { video_id: id }, data: { recipients, failures } }); },
    finish: news.finish,
  };
}
