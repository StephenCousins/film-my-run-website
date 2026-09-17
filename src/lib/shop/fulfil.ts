/**
 * What happens after Stripe says an order is paid: mark it, place each supplier's lines with
 * that supplier, email the buyer. Dependencies are injected so the idempotency rule is
 * testable without Stripe.
 */
import type { Supplier } from '@/lib/shop';
import { linesFor, type OrderLine } from './orders';
import type { PrintifyAddress } from './printify';

export interface PaidOrder {
  id: number;
  status: string;
  items: OrderLine[];
}

export type SupplierOrderIds = Partial<Record<Supplier, string>>;

export interface FulfilDeps {
  load: (sessionId: string) => Promise<PaidOrder | null>;
  markPaid: (id: number, email: string, address: PrintifyAddress) => Promise<void>;
  place: (supplier: Supplier, lines: OrderLine[], order: PaidOrder, address: PrintifyAddress) => Promise<string>;
  markSubmitted: (id: number, ids: SupplierOrderIds) => Promise<void>;
  emailConfirmation: (order: PaidOrder, email: string) => Promise<void>;
}

const SUPPLIERS: Supplier[] = ['printify', 'contrado'];

/** Returns what it did, so the webhook can log it. Safe to call twice for the same session. */
export async function fulfilPaidSession(sessionId: string, email: string, address: PrintifyAddress, d: FulfilDeps) {
  const order = await d.load(sessionId);
  if (!order) return 'unknown-session';
  if (order.status !== 'pending') return `already-${order.status}`;
  await d.markPaid(order.id, email, address);
  const ids: SupplierOrderIds = {};
  for (const supplier of SUPPLIERS) {
    const lines = linesFor(order.items, supplier);
    if (lines.length) ids[supplier] = await d.place(supplier, lines, order, address);
  }
  await d.markSubmitted(order.id, ids);
  await d.emailConfirmation(order, email);
  return 'submitted';
}

/** Stripe's shipping details → the address both suppliers want. */
export function toPrintifyAddress(
  name: string | null | undefined,
  email: string,
  phone: string | null | undefined,
  a: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null },
): PrintifyAddress {
  const parts = (name ?? '').trim().split(/\s+/);
  const last_name = parts.length > 1 ? parts.pop()! : '';
  return {
    first_name: parts.join(' ') || 'Customer',
    last_name,
    email,
    phone: phone ?? '',
    country: a.country ?? 'GB',
    region: a.state ?? '',
    address1: a.line1 ?? '',
    address2: a.line2 ?? undefined,
    city: a.city ?? '',
    zip: a.postal_code ?? '',
  };
}
