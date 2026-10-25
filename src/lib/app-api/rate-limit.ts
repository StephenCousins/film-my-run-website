import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Light per-IP rate limiting for /api/app/v1/* (iPhone app routes).
 * In-memory, resets on deploy: the same shape as /api/track and the quiz
 * routes. Enough to stop a runaway client; not a security boundary.
 */
const DEFAULT_LIMIT = 60;
const WINDOW_MS = 60_000;

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

/**
 * Railway's edge sets X-Real-IP and appends the client to X-Forwarded-For, so
 * the LAST entry is the one it saw. The first entry is whatever the caller
 * sent: keying on it let anyone pick a fresh IP per request.
 */
export function clientIp(request: Request): string {
  return request.headers.get('x-real-ip')?.trim() || request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown';
}

/** Returns the seconds until the window resets when over the limit, else null. */
export function checkRateLimit(
  key: string,
  limit = DEFAULT_LIMIT,
  now = Date.now()
): number | null {
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  entry.count += 1;
  if (entry.count > limit) return Math.ceil((entry.resetAt - now) / 1000);
  return null;
}

/** Test hook. */
export function resetRateLimits() {
  buckets.clear();
}

type Handler = (request: NextRequest) => Promise<Response> | Response;

/**
 * Wraps a route handler with the per-IP limit and app headers.
 * `cacheControl` is set on successful responses only.
 */
export function withAppApi(
  handler: Handler,
  options: { limit?: number; cacheControl?: string } = {}
): Handler {
  return async (request) => {
    const retryAfter = checkRateLimit(
      `${request.nextUrl.pathname}:${clientIp(request)}`,
      options.limit
    );
    if (retryAfter !== null) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }
    const response = await handler(request);
    logAppCall(request);
    response.headers.set('X-FMR-API', 'v1');
    if (options.cacheControl && response.ok) {
      response.headers.set('Cache-Control', options.cacheControl);
    }
    return response;
  };
}

/**
 * One site_events row per app API call, for /admin/stats. The app sends no install id, so a device is a hash of
 * IP + user agent that changes daily: distinct ones per day approximate daily app users. Never blocks the reply.
 */
function logAppCall(request: NextRequest) {
  if (process.env.NODE_ENV === 'test') return;
  const day = new Date().toISOString().slice(0, 10);
  const device = createHash('sha256').update(`${clientIp(request)}|${request.headers.get('user-agent') ?? ''}|${day}`).digest('hex').slice(0, 16);
  const route = request.nextUrl.pathname.replace('/api/app/v1', '').replace(/\/\d+(?=\/|$)/g, '/:id') || '/';
  prisma.site_events
    .create({ data: { name: 'app_api', label: route.slice(0, 100), detail: request.method, session_id: device } })
    .catch(() => {});
}
