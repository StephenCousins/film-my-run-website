/**
 * Contrado has no webhooks, so a GitHub cron calls this to ask about every submitted Contrado
 * order; once tracking exists the buyer gets the shipped email. Printify orders arrive via webhook.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contradoShipment } from '@/lib/shop/contrado';
import { orderShipped } from '@/lib/shop/email';
import type { OrderLine } from '@/lib/shop/orders';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const open = await prisma.orders.findMany({ where: { status: 'submitted', contrado_order_id: { not: null } } });
  const shipped: number[] = [];
  for (const o of open) {
    const s = await contradoShipment(o.contrado_order_id!);
    if (!s) continue;
    await prisma.orders.update({ where: { id: o.id }, data: { status: 'shipped', updated_at: new Date() } });
    if (o.email) await orderShipped(o.email, o.id, o.items as unknown as OrderLine[], s.courierName ?? '', s.trackingId ?? '', s.trackingUrl ?? '');
    shipped.push(o.id);
  }
  return NextResponse.json({ checked: open.length, shipped });
}
