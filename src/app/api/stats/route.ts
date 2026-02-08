import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Bearer token auth
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  const statsKey = process.env.STATS_KEY;

  if (!statsKey || token !== statsKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Run queries in parallel
    const [
      totalViews,
      todayViews,
      weekViews,
      monthViews,
      uniqueToday,
      uniqueWeek,
      avgDurationResult,
      popularPages,
      topReferrers,
      dailyViewsRaw,
      devices,
      browsers,
      countries,
    ] = await Promise.all([
      // Total views
      prisma.page_views.count(),

      // Today views
      prisma.page_views.count({
        where: { created_at: { gte: todayStart } },
      }),

      // Week views
      prisma.page_views.count({
        where: { created_at: { gte: weekStart } },
      }),

      // Month views
      prisma.page_views.count({
        where: { created_at: { gte: monthStart } },
      }),

      // Unique visitors today (distinct session_id)
      prisma.page_views.findMany({
        where: {
          created_at: { gte: todayStart },
          session_id: { not: null },
        },
        distinct: ['session_id'],
        select: { session_id: true },
      }),

      // Unique visitors this week
      prisma.page_views.findMany({
        where: {
          created_at: { gte: weekStart },
          session_id: { not: null },
        },
        distinct: ['session_id'],
        select: { session_id: true },
      }),

      // Average duration (views with duration > 0, capped at 1 hour)
      prisma.page_views.aggregate({
        where: {
          created_at: { gte: monthStart },
          duration: { gt: 0, lte: 3600 },
        },
        _avg: { duration: true },
      }),

      // Popular pages (last 30 days, top 20)
      prisma.page_views.groupBy({
        by: ['path'],
        where: { created_at: { gte: monthStart } },
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),

      // Top referrers (last 30 days, non-null)
      prisma.page_views.groupBy({
        by: ['referrer'],
        where: {
          created_at: { gte: monthStart },
          referrer: { not: null },
        },
        _count: { referrer: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: 20,
      }),

      // Daily views (last 30 days) - use raw query for date grouping
      prisma.$queryRaw<Array<{ date: string; views: bigint }>>`
        SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*)::bigint as views
        FROM page_views
        WHERE created_at >= ${monthStart}
        GROUP BY to_char(created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `,

      // Devices (last 30 days)
      prisma.page_views.groupBy({
        by: ['device'],
        where: { created_at: { gte: monthStart } },
        _count: { device: true },
        orderBy: { _count: { device: 'desc' } },
      }),

      // Browsers (last 30 days)
      prisma.page_views.groupBy({
        by: ['browser'],
        where: { created_at: { gte: monthStart } },
        _count: { browser: true },
        orderBy: { _count: { browser: 'desc' } },
        take: 10,
      }),

      // Countries (last 30 days)
      prisma.page_views.groupBy({
        by: ['country'],
        where: {
          created_at: { gte: monthStart },
          country: { not: null },
        },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 20,
      }),
    ]);

    // Extract hostnames from referrers for cleaner display
    function extractHostname(ref: string | null): string {
      if (!ref) return 'Direct';
      try {
        return new URL(ref).hostname.replace(/^www\./, '');
      } catch {
        return ref;
      }
    }

    // Aggregate referrers by hostname
    const referrersByHost = new Map<string, number>();
    for (const r of topReferrers) {
      const host = extractHostname(r.referrer);
      referrersByHost.set(host, (referrersByHost.get(host) ?? 0) + r._count.referrer);
    }
    const aggregatedReferrers = [...referrersByHost.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    return NextResponse.json({
      summary: {
        totalViews,
        todayViews,
        weekViews,
        monthViews,
        uniqueToday: uniqueToday.length,
        uniqueWeek: uniqueWeek.length,
        avgDuration: Math.round(avgDurationResult._avg.duration ?? 0),
      },
      popularPages: popularPages.map((p) => ({
        path: p.path,
        views: p._count.path,
      })),
      topReferrers: aggregatedReferrers,
      dailyViews: dailyViewsRaw.map((d) => ({
        date: d.date,
        views: Number(d.views),
      })),
      devices: devices.map((d) => ({
        device: d.device ?? 'Unknown',
        count: d._count.device,
      })),
      browsers: browsers.map((b) => ({
        browser: b.browser ?? 'Unknown',
        count: b._count.browser,
      })),
      countries: countries.map((c) => ({
        country: c.country ?? 'Unknown',
        count: c._count.country,
      })),
    });
  } catch (err) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
