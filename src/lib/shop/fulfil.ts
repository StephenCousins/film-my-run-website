/**
 * What happens after Stripe says an order is paid: mark it, place each supplier's lines with
 * that supplier, email the buyer. Dependencies are injected so the idempotency rule is
 * testable without Stripe.
 */
import type { Supplier } from '@/lib/shop';
import { linesFor, type OrderLine } from './orders';
import { PrintifyDraftError, type PrintifyAddress } from './printify';

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
  /**
   * Placing with a supplier failed: mark the order failed, keep what was placed, tell the owner.
   * `drafts`: orders a supplier created but did not send to production.
   */
  flagFailed: (id: number, error: Error, ids: SupplierOrderIds, drafts: SupplierOrderIds) => Promise<void>;
  /** Every supplier accepted but saving that failed: the order is placed, so only tell the owner. */
  alertNotSaved: (id: number, error: Error, ids: SupplierOrderIds) => Promise<void>;
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
  try {
    for (const supplier of SUPPLIERS) {
      const lines = linesFor(order.items, supplier);
      if (lines.length) ids[supplier] = await d.place(supplier, lines, order, address);
    }
  } catch (e) {
    // Never a silent drop: a Stripe retry finds the order 'failed' and leaves it for a person.
    const drafts: SupplierOrderIds = e instanceof PrintifyDraftError ? { printify: e.draftId } : {};
    await d.flagFailed(order.id, e as Error, ids, drafts);
    throw e;
  }
  let result = 'submitted';
  try {
    await d.markSubmitted(order.id, ids);
  } catch (e) {
    // Placed with every supplier; only our record is behind. Not a failed order.
    await d.alertNotSaved(order.id, e as Error, ids);
    result = 'submitted-not-saved';
  }
  await d.emailConfirmation(order, email);
  return result;
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

type ShippingDetails = { name?: string | null; address?: Parameters<typeof toPrintifyAddress>[3] | null };

/**
 * Webhook events arrive in the ENDPOINT's Stripe API version, not the client's pinned one.
 * From 2025-03-31 the address lives at collected_information.shipping_details; reading only
 * the old field dropped a paid order on 2 Oct 2026.
 */
export function shippingOf(session: {
  shipping_details?: ShippingDetails | null;
  collected_information?: { shipping_details?: ShippingDetails | null } | null;
}): ShippingDetails | null {
  return session.collected_information?.shipping_details ?? session.shipping_details ?? null;
}
