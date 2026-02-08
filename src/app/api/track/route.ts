import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter (resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Lightweight UA parser — no external dependencies
function parseUserAgent(ua: string): { browser: string; device: string; os: string } {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua) && !/Chrome/.test(ua)
          ? 'Safari'
          : /Firefox\//.test(ua)
            ? 'Firefox'
            : 'Other';

  const device = /Mobi|Android.*Mobile|iPhone/.test(ua)
    ? 'mobile'
    : /iPad|Android(?!.*Mobile)|Tablet/.test(ua)
      ? 'tablet'
      : 'desktop';

  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Other';

  return { browser, device, os };
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const body = await request.json();
    const { path, referrer, sessionId, pageViewId, duration } = body;

    // Duration update for an existing page view
    if (pageViewId && typeof duration === 'number') {
      const cappedDuration = Math.min(Math.max(0, Math.round(duration)), 3600);
      await prisma.page_views.update({
        where: { id: pageViewId },
        data: { duration: cappedDuration },
      });
      return NextResponse.json({ success: true });
    }

    // New page view
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    // Skip admin and API paths
    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const ua = request.headers.get('user-agent') ?? '';
    // Skip common bots
    if (/bot|crawler|spider|slurp|googlebot|bingbot|yandex|baidu/i.test(ua)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const { browser, device, os } = parseUserAgent(ua);
    const country = request.headers.get('cf-ipcountry') ?? null;

    const pageView = await prisma.page_views.create({
      data: {
        path: path.slice(0, 500),
        referrer: typeof referrer === 'string' ? referrer.slice(0, 2000) : null,
        user_agent: ua.slice(0, 500),
        session_id: typeof sessionId === 'string' ? sessionId.slice(0, 100) : null,
        browser,
        device,
        os,
        country,
      },
    });

    return NextResponse.json({ success: true, pageViewId: pageView.id });
  } catch (err) {
    console.error('Track page view error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
