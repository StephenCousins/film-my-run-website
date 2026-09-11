import { NextRequest, NextResponse } from 'next/server';

/**
 * Light per-IP rate limiting for /api/app/v1/* (iPhone app routes).
 * In-memory, resets on deploy: the same shape as /api/track and the quiz
 * routes. Enough to stop a runaway client; not a security boundary.
 */
const DEFAULT_LIMIT = 60;
const WINDOW_MS = 60_000;

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
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
    response.headers.set('X-FMR-API', 'v1');
    if (options.cacheControl && response.ok) {
      response.headers.set('Cache-Control', options.cacheControl);
    }
    return response;
  };
}
