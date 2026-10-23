// Everything /admin/stats shows, from tables the site already fills (page_views, newsletter_subscribers, orders,
// quiz_results, fartlex_results, assistant_messages, push_devices) plus site_events (tool uses, outbound clicks,
// app API calls). Windows are rolling: the last 7 and 30 days.
import { prisma } from '@/lib/db';

const n = (v: unknown) => Number(v ?? 0);

/** Tools: the event label, its page, and how it's named on the stats page. */
export const TOOLS = [
  { label: 'calculators', path: '/tools/calculators', name: 'Calculators' },
  { label: 'how-fast-am-i', path: '/tools/how-fast-am-i', name: 'How fast am I' },
  { label: 'race-map', path: '/tools/race-map', name: 'Race map (race opened)' },
  { label: 'shoe-finder', path: '/tools/shoe-finder', name: 'Shoe finder (search)' },
  { label: 'route-comparison', path: '/tools/route-comparison', name: 'Route comparison (route added)' },
  { label: 'stone-tracker', path: '/tools/stone-tracker', name: 'Stone tracker (search)' },
  { label: 'parkrun', path: '/tools/parkrun', name: 'parkrun stats' },
  { label: 'runner-quiz', path: '/tools/runner-quiz', name: 'Runner quiz (finished)' },
  { label: 'fartlex', path: '/games/fartlex', name: 'Fartlex (games, signed in)' },
  { label: 'assistant', path: null, name: 'Site assistant (questions)' },
] as const;

export async function loadStats() {
  const [
    traffic, daily, blog, news, pages, referrers, countries, devices,
    toolEvents, toolViews, quiz, fartlex, assistant, toolDetails,
    outbound, newsletter, sources, members, orders, appDaily, appRoutes, push,
  ] = await Promise.all([
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT count(*) FILTER (WHERE created_at > now() - interval '1 day') views1,
             count(DISTINCT session_id) FILTER (WHERE created_at > now() - interval '1 day') visitors1,
             count(*) FILTER (WHERE created_at > now() - interval '7 days') views7,
             count(DISTINCT session_id) FILTER (WHERE created_at > now() - interval '7 days') visitors7,
             count(*) views30, count(DISTINCT session_id) visitors30,
             avg(duration) FILTER (WHERE duration BETWEEN 1 AND 3600) avg_secs
      FROM page_views WHERE created_at > now() - interval '30 days'`,
    prisma.$queryRaw<{ day: string; views: bigint; visitors: bigint }[]>`
      SELECT to_char(created_at, 'YYYY-MM-DD') AS day, count(*) views, count(DISTINCT session_id) visitors
      FROM page_views WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 1`,
    // Blog and news: last 30 days, with all time alongside; ordered by the last 30 days.
    prisma.$queryRaw<{ title: string | null; path: string; views30: bigint; readers30: bigint; avg_secs: number | null; views_all: bigint }[]>`
      SELECT p.title, v.path, count(*) FILTER (WHERE v.created_at > now() - interval '30 days') views30,
             count(DISTINCT v.session_id) FILTER (WHERE v.created_at > now() - interval '30 days') readers30,
             avg(v.duration) FILTER (WHERE v.created_at > now() - interval '30 days' AND v.duration BETWEEN 1 AND 3600) avg_secs,
             count(*) views_all
      FROM page_views v LEFT JOIN posts p ON v.path = '/blog/' || p.slug
      WHERE v.path LIKE '/blog/_%' GROUP BY 1, 2 ORDER BY 3 DESC, 6 DESC LIMIT 20`,
    prisma.$queryRaw<{ title: string | null; path: string; views30: bigint; readers30: bigint; avg_secs: number | null; views_all: bigint }[]>`
      SELECT s.title, v.path, count(*) FILTER (WHERE v.created_at > now() - interval '30 days') views30,
             count(DISTINCT v.session_id) FILTER (WHERE v.created_at > now() - interval '30 days') readers30,
             avg(v.duration) FILTER (WHERE v.created_at > now() - interval '30 days' AND v.duration BETWEEN 1 AND 3600) avg_secs,
             count(*) views_all
      FROM page_views v LEFT JOIN news_stories s ON v.path = '/news/' || s.slug
      WHERE v.path LIKE '/news/_%' AND v.created_at > now() - interval '90 days' GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 15`,
    prisma.$queryRaw<{ path: string; views: bigint; visitors: bigint }[]>`
      SELECT path, count(*) views, count(DISTINCT session_id) visitors FROM page_views
      WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 20`,
    prisma.$queryRaw<{ host: string; visits: bigint }[]>`
      SELECT substring(referrer from '^https?://(?:www\\.)?([^/:]+)') AS host, count(*) visits FROM page_views
      WHERE created_at > now() - interval '30 days' AND referrer ~ '^https?://' AND referrer !~ '^https?://(www\\.)?filmmyrun\\.'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
    prisma.$queryRaw<{ country: string; visitors: bigint }[]>`
      SELECT coalesce(country, '?') country, count(DISTINCT session_id) visitors FROM page_views
      WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    prisma.$queryRaw<{ device: string; visitors: bigint }[]>`
      SELECT coalesce(device, '?') device, count(DISTINCT session_id) visitors FROM page_views
      WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC`,
    prisma.$queryRaw<{ label: string; uses7: bigint; uses30: bigint; people30: bigint; walls30: bigint }[]>`
      SELECT label,
             count(*) FILTER (WHERE detail NOT LIKE '%(sign-in asked)' AND created_at > now() - interval '7 days') uses7,
             count(*) FILTER (WHERE detail NOT LIKE '%(sign-in asked)') uses30,
             count(DISTINCT session_id) FILTER (WHERE detail NOT LIKE '%(sign-in asked)') people30,
             count(*) FILTER (WHERE detail LIKE '%(sign-in asked)') walls30
      FROM site_events WHERE name = 'tool' AND created_at > now() - interval '30 days' GROUP BY 1`,
    prisma.$queryRaw<{ prefix: string; views: bigint }[]>`
      SELECT t.prefix, count(v.id) views FROM unnest(${TOOLS.flatMap((t) => (t.path ? [t.path] : []))}::text[]) AS t(prefix)
      LEFT JOIN page_views v ON v.path LIKE t.prefix || '%' AND v.created_at > now() - interval '30 days' GROUP BY 1`,
    prisma.$queryRaw<{ uses7: bigint; uses30: bigint }[]>`
      SELECT count(*) FILTER (WHERE created_at > now() - interval '7 days') uses7, count(*) uses30
      FROM quiz_results WHERE created_at > now() - interval '30 days'`,
    prisma.$queryRaw<{ uses7: bigint; uses30: bigint; people30: bigint }[]>`
      SELECT count(*) FILTER (WHERE created_at > now() - interval '7 days') uses7, count(*) uses30, count(DISTINCT user_id) people30
      FROM fartlex_results WHERE created_at > now() - interval '30 days'`,
    prisma.$queryRaw<{ uses7: bigint; uses30: bigint; people30: bigint }[]>`
      SELECT count(*) FILTER (WHERE created_at > now() - interval '7 days') uses7, count(*) uses30, count(DISTINCT session_id) people30
      FROM assistant_messages WHERE role = 'user' AND created_at > now() - interval '30 days'`,
    prisma.$queryRaw<{ label: string; detail: string; uses: bigint }[]>`
      SELECT label, detail, count(*) uses FROM site_events
      WHERE name = 'tool' AND label IN ('calculators', 'race-map') AND created_at > now() - interval '30 days'
        AND detail NOT LIKE '%(sign-in asked)'
      GROUP BY 1, 2 ORDER BY 3 DESC`,
    prisma.$queryRaw<{ host: string; clicks: bigint; people: bigint }[]>`
      SELECT label host, count(*) clicks, count(DISTINCT session_id) people FROM site_events
      WHERE name = 'outbound' AND created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT count(*) FILTER (WHERE status = 'active') active,
             count(*) FILTER (WHERE subscribed_at > now() - interval '7 days') new7,
             count(*) FILTER (WHERE subscribed_at > now() - interval '30 days') new30,
             count(*) FILTER (WHERE unsubscribed_at > now() - interval '30 days') unsub30
      FROM newsletter_subscribers`,
    prisma.$queryRaw<{ source: string | null; active: bigint; new30: bigint }[]>`
      SELECT source, count(*) FILTER (WHERE status = 'active') active,
             count(*) FILTER (WHERE subscribed_at > now() - interval '30 days') new30
      FROM newsletter_subscribers GROUP BY 1 ORDER BY 2 DESC`,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT count(*) total, count(*) FILTER (WHERE created_at > now() - interval '30 days') new30,
             count(*) FILTER (WHERE access_tier <> 'FREE' AND (subscription_end IS NULL OR subscription_end > now())) paying
      FROM users`,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT count(*) FILTER (WHERE created_at > now() - interval '30 days') orders30,
             coalesce(sum(total_cents) FILTER (WHERE created_at > now() - interval '30 days'), 0) pence30,
             count(*) orders_all, coalesce(sum(total_cents), 0) pence_all
      FROM orders WHERE status IN ('paid', 'submitted', 'shipped')`,
    prisma.$queryRaw<{ day: string; devices: bigint; calls: bigint }[]>`
      SELECT to_char(created_at, 'YYYY-MM-DD') AS day, count(DISTINCT session_id) devices, count(*) calls FROM site_events
      WHERE name = 'app_api' AND created_at > now() - interval '14 days' GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ route: string; calls: bigint }[]>`
      SELECT label route, count(*) calls FROM site_events
      WHERE name = 'app_api' AND created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
    prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT count(*) FILTER (WHERE invalid_at IS NULL AND environment = 'production') devices,
             count(*) FILTER (WHERE invalid_at IS NULL AND environment = 'production' AND news) news_on,
             count(*) FILTER (WHERE invalid_at IS NULL AND environment = 'production' AND last_seen_at > now() - interval '30 days') seen30
      FROM push_devices`,
  ]);

  const byLabel = new Map(toolEvents.map((t) => [t.label, t]));
  const viewsByPath = new Map(toolViews.map((t) => [t.prefix, n(t.views)]));
  const fromTable = { 'runner-quiz': { ...quiz[0], people30: null }, fartlex: fartlex[0], assistant: assistant[0] } as Record<string, { uses7: bigint; uses30: bigint; people30: bigint | null }>;
  const tools = TOOLS.map((t) => {
    const e = byLabel.get(t.label), tbl = fromTable[t.label];
    return {
      name: t.name,
      uses7: tbl ? n(tbl.uses7) : e ? n(e.uses7) : null,
      uses30: tbl ? n(tbl.uses30) : e ? n(e.uses30) : null,
      people30: tbl ? (tbl.people30 == null ? null : n(tbl.people30)) : e ? n(e.people30) : null,
      walls30: e ? n(e.walls30) : 0,
      views30: t.path ? viewsByPath.get(t.path) ?? 0 : null,
      measured: !!tbl || t.label !== 'parkrun',   // parkrun stats is a dashboard: opening it is the use
    };
  });

  const days = <T extends { day: string }>(rows: T[], count: number) => {
    const map = new Map(rows.map((r) => [r.day, r]));
    return Array.from({ length: count }, (_, i) => {
      const day = new Date(Date.now() - (count - 1 - i) * 864e5).toISOString().slice(0, 10);
      return { day, row: map.get(day) };
    });
  };
  const t = traffic[0], m = members[0], o = orders[0], nl = newsletter[0], p = push[0];
  const posts = (rows: typeof blog) => rows.map((r) => ({
    title: r.title ?? r.path, path: r.path, views30: n(r.views30), readers30: n(r.readers30),
    avgSecs: r.avg_secs == null ? null : Math.round(Number(r.avg_secs)), viewsAll: n(r.views_all),
  }));

  return {
    traffic: {
      views1: n(t.views1), visitors1: n(t.visitors1), views7: n(t.views7), visitors7: n(t.visitors7),
      views30: n(t.views30), visitors30: n(t.visitors30), avgSecs: t.avg_secs == null ? null : Math.round(Number(t.avg_secs)),
    },
    daily: days(daily, 30).map(({ day, row }) => ({ day, views: n(row?.views), visitors: n(row?.visitors) })),
    blog: posts(blog),
    news: posts(news),
    pages: pages.map((r) => ({ path: r.path, views: n(r.views), visitors: n(r.visitors) })),
    referrers: referrers.map((r) => ({ label: r.host ?? '?', value: n(r.visits) })),
    countries: countries.map((r) => ({ label: r.country, value: n(r.visitors) })),
    devices: devices.map((r) => ({ label: r.device, value: n(r.visitors) })),
    tools,
    toolDetails: toolDetails.map((r) => ({ tool: r.label, detail: r.detail, uses: n(r.uses) })),
    outbound: outbound.map((r) => ({ label: r.host, value: n(r.clicks), people: n(r.people) })),
    newsletter: { active: n(nl.active), new7: n(nl.new7), new30: n(nl.new30), unsub30: n(nl.unsub30) },
    sources: sources.map((r) => ({ label: r.source ?? 'before 30 Sep 2026', value: n(r.active), new30: n(r.new30) })),
    members: { total: n(m.total), new30: n(m.new30), paying: n(m.paying) },
    orders: { orders30: n(o.orders30), pence30: n(o.pence30), ordersAll: n(o.orders_all), penceAll: n(o.pence_all) },
    app: {
      daily: days(appDaily, 14).map(({ day, row }) => ({ day, devices: n(row?.devices), calls: n(row?.calls) })),
      routes: appRoutes.map((r) => ({ label: r.route, value: n(r.calls) })),
      pushDevices: n(p.devices), newsOn: n(p.news_on), seen30: n(p.seen30),
    },
  };
}
export type Stats = Awaited<ReturnType<typeof loadStats>>;
