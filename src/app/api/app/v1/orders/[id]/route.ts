import type { NextRequest } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/app-api/rate-limit';
import { handleGetOrder, liveOrderDeps } from '@/lib/members/orders';

export const dynamic = 'force-dynamic';

// withAppApi's handler takes only the request; dynamic segments need the second argument, so the limit is applied by hand.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const retryAfter = checkRateLimit(`/api/app/v1/orders/[id]:${clientIp(request)}`);
  if (retryAfter !== null) return new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), { status: 429, headers: { 'Retry-After': String(retryAfter), 'content-type': 'application/json' } });
  const { id } = await params;
  const response = await handleGetOrder(request, id, liveOrderDeps);
  response.headers.set('X-FMR-API', 'v1');
  return response;
}
