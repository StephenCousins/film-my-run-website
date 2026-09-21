/** A member's orders (spec §4). Rows in, DTOs out; Prisma only in liveOrderDeps. */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { OrderLine } from '@/lib/shop/orders';
import { memberFromBearer, type MemberDeps } from './handlers';
import { liveMemberDeps } from './store';

export type OrderDTO = {
  id: number;
  placedAt: string;
  status: 'paid' | 'submitted' | 'shipped';
  items: { slug: string; name: string; variant: string; quantity: number; pricePence: number; imageUrl: string | null }[];
  totalPence: number;
  currency: string;
  trackingUrl: string | null;
};

export type OrderRow = { id: number; created_at: Date; status: string; items: unknown; total_cents: number; currency: string; tracking_url: string | null; user_id: number | null };

const VISIBLE = new Set(['paid', 'submitted', 'shipped']);

export function toOrderDTO(row: OrderRow): OrderDTO | null {
  if (!VISIBLE.has(row.status)) return null;
  const lines = Array.isArray(row.items) ? (row.items as OrderLine[]) : [];
  return {
    id: row.id,
    placedAt: row.created_at.toISOString(),
    status: row.status as OrderDTO['status'],
    items: lines.map((l) => ({ slug: l.slug, name: l.name, variant: l.variantLabel ?? '', quantity: l.quantity, pricePence: l.unitPence, imageUrl: l.image ?? null })),
    totalPence: row.total_cents,
    currency: row.currency,
    trackingUrl: row.tracking_url,
  };
}

export type OrderDeps = {
  ordersFor: (userId: number) => Promise<OrderRow[]>;
  orderById: (id: number) => Promise<OrderRow | null>;
} & Pick<MemberDeps, 'memberForToken' | 'now'>;

const signedOut = () => NextResponse.json({ ok: false, error: 'signed_out' }, { status: 401 });

/** GET /api/app/v1/orders */
export async function handleListOrders(req: NextRequest, deps: OrderDeps): Promise<Response> {
  const member = await memberFromBearer(req, deps);
  if (!member) return signedOut();
  const rows = await deps.ordersFor(member.id);
  const orders = rows.map(toOrderDTO).filter((o): o is OrderDTO => o !== null).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  return NextResponse.json({ ok: true, orders });
}

/** GET /api/app/v1/orders/{id} */
export async function handleGetOrder(req: NextRequest, id: string, deps: OrderDeps): Promise<Response> {
  const member = await memberFromBearer(req, deps);
  if (!member) return signedOut();
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 });
  const row = await deps.orderById(n);
  const order = row && row.user_id === member.id ? toOrderDTO(row) : null;
  if (!order) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}

const select = { id: true, created_at: true, status: true, items: true, total_cents: true, currency: true, tracking_url: true, user_id: true } as const;

export const liveOrderDeps: OrderDeps = {
  ordersFor: (userId) => prisma.orders.findMany({ where: { user_id: userId }, select, orderBy: { created_at: 'desc' } }),
  orderById: (id) => prisma.orders.findUnique({ where: { id }, select }),
  memberForToken: liveMemberDeps.memberForToken,
};
