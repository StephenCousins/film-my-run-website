import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { handleGetOrder, handleListOrders, toOrderDTO, type OrderDeps, type OrderRow } from './orders';

const NOW = Date.UTC(2026, 8, 21);
const line = { slug: 'run-tee', name: 'Run tee', variantLabel: 'Black / M', image: 'https://img/1.jpg', supplier: 'printify', supplierProductId: 'p1', variantId: 1, quantity: 2, unitPence: 1999 };
const row = (over: Partial<OrderRow>): OrderRow => ({ id: 1, created_at: new Date(NOW), status: 'paid', items: [line], total_cents: 4357, currency: 'GBP', tracking_url: null, user_id: 7, ...over });

describe('toOrderDTO', () => {
  it('maps a row', () => {
    expect(toOrderDTO(row({ status: 'shipped', tracking_url: 'https://track/1' }))).toEqual({
      id: 1, placedAt: '2026-09-21T00:00:00.000Z', status: 'shipped',
      items: [{ slug: 'run-tee', name: 'Run tee', variant: 'Black / M', quantity: 2, pricePence: 1999, imageUrl: 'https://img/1.jpg' }],
      totalPence: 4357, currency: 'GBP', trackingUrl: 'https://track/1',
    });
  });
  it('drops pending and unknown statuses', () => {
    expect(toOrderDTO(row({ status: 'pending' }))).toBeNull();
    expect(toOrderDTO(row({ status: 'weird' }))).toBeNull();
  });
});

function deps(rows: OrderRow[], memberId: number | null = 7): OrderDeps {
  return {
    ordersFor: async (userId) => rows.filter((r) => r.user_id === userId),
    orderById: async (id) => rows.find((r) => r.id === id) ?? null,
    memberForToken: async (token) => (token === 'good' && memberId ? { id: memberId, email: 'r@e.com', name: null, proUntil: null } : null),
    now: () => NOW,
  };
}
const req = (path: string, token?: string) => new NextRequest(`https://filmmyrun.com/api/app/v1/orders${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('handleListOrders', () => {
  it('returns the member\'s non-pending orders, newest first', async () => {
    const rows = [row({ id: 1, created_at: new Date(NOW - 1000) }), row({ id: 2, status: 'pending' }), row({ id: 3, user_id: 8 }), row({ id: 4, status: 'shipped' })];
    const res = await handleListOrders(req('', 'good'), deps(rows));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders.map((o: { id: number }) => o.id)).toEqual([4, 1]);
  });
  it('is 401 without a live token', async () => {
    expect((await handleListOrders(req(''), deps([]))).status).toBe(401);
    expect((await handleListOrders(req('', 'bad'), deps([]))).status).toBe(401);
  });
});

describe('handleGetOrder', () => {
  it('returns one order, 404 for another member\'s or a pending one, 400 for a bad id', async () => {
    const rows = [row({ id: 1 }), row({ id: 2, user_id: 8 }), row({ id: 3, status: 'pending' })];
    expect((await handleGetOrder(req('/1', 'good'), '1', deps(rows))).status).toBe(200);
    expect((await (await handleGetOrder(req('/1', 'good'), '1', deps(rows))).json()).order.id).toBe(1);
    expect((await handleGetOrder(req('/2', 'good'), '2', deps(rows))).status).toBe(404);
    expect((await handleGetOrder(req('/3', 'good'), '3', deps(rows))).status).toBe(404);
    expect((await handleGetOrder(req('/9', 'good'), '9', deps(rows))).status).toBe(404);
    expect((await handleGetOrder(req('/x', 'good'), 'x', deps(rows))).status).toBe(400);
    expect((await handleGetOrder(req('/1'), '1', deps(rows))).status).toBe(401);
  });
});
