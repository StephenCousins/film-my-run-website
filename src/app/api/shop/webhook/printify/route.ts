/** Printify → order:shipment:created → tracking email. Signature: x-pfy-signature = sha256=HMAC(secret, body). */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPrintifySignature } from '@/lib/shop/printify';
import { orderShipped } from '@/lib/shop/email';
import type { OrderLine } from '@/lib/shop/orders';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  const body = await request.text();
  if (!verifyPrintifySignature(body, request.headers.get('x-pfy-signature'), secret)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  const event = JSON.parse(body) as { type: string; resource: { id: string; data?: { shipment?: { carrier?: string; number?: string; url?: string } } } };
  if (event.type !== 'order:shipment:created') return NextResponse.json({ ignored: event.type });

  const order = await prisma.orders.findFirst({ where: { printify_order_id: event.resource.id } });
  if (!order || !order.email) return NextResponse.json({ ignored: 'unknown order' });
  if (order.status === 'shipped') return NextResponse.json({ ignored: 'already shipped' });

  const s = event.resource.data?.shipment ?? {};
  await prisma.orders.update({ where: { id: order.id }, data: { status: 'shipped', tracking_url: s.url || null, updated_at: new Date() } });
  await orderShipped(order.email, order.id, order.items as unknown as OrderLine[], s.carrier ?? '', s.number ?? '', s.url ?? '');
  return NextResponse.json({ result: 'shipped' });
}
