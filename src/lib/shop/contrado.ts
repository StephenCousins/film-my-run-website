/** Contrado Helix API: orders only (products are made in their designer). No webhooks; poll for shipping. */
import type { OrderLine } from './orders';
import type { PrintifyAddress } from './printify';

const BASE = 'https://api.contrado.app/helix/v1';

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const key = process.env.CONTRADO_API_KEY;
  if (!key) throw new Error('CONTRADO_API_KEY not set');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { success: boolean; message: string; data: T; error?: { details?: string } };
  if (!res.ok || !json.success) throw new Error(`Contrado ${method} ${path} → ${res.status}: ${json.error?.details ?? json.message}`);
  return json.data;
}

/** Places the order and returns Contrado's numeric order id (needed for the shipment poll). */
export async function createContradoOrder(externalId: string, lines: OrderLine[], a: PrintifyAddress): Promise<string> {
  const created = await call<{ referenceId: string }>('POST', '/orders/create', {
    externalReferenceId: externalId,
    cultureCode: 'en-GB',
    currencyCode: 'GBP',
    recipient: {
      name: `${a.first_name} ${a.last_name}`.trim(),
      company: '',
      address1: a.address1,
      address2: a.address2 ?? '',
      city: a.city,
      stateCode: '',
      stateName: a.region,
      countryCode: a.country,
      country: a.country === 'GB' ? 'United Kingdom' : a.country,
      postCode: a.zip,
      phone: a.phone,
      mobile: a.phone,
      recipientPhone: a.phone,
      email: a.email,
    },
    lineItem: lines.map((l, i) => ({
      storeProductId: Number(l.supplierProductId),
      externalReferenceId: `${externalId}-${i + 1}`,
      variantId: String(l.variantId),
      selectedOptions: l.options ?? [],
      quantity: l.quantity,
      price: l.unitPence / 100,
    })),
    totalAmount: lines.reduce((s, l) => s + (l.unitPence * l.quantity) / 100, 0),
  });
  const status = await call<{ contradoOrderId: number }[]>('GET', `/orders/by-reference/${created.referenceId}/status`);
  return String(status[0]?.contradoOrderId ?? created.referenceId);
}

export interface ContradoShipment {
  courierName: string | null;
  trackingId: string | null;
  trackingUrl: string | null;
  shipmentStatus: string | null;
}

/** Null until Contrado has dispatched it (their API answers "not found" before then). */
export async function contradoShipment(orderId: string): Promise<ContradoShipment | null> {
  const res = await fetch(`${BASE}/orders/${orderId}/shipment/status`, { headers: { 'X-API-KEY': process.env.CONTRADO_API_KEY ?? '' } });
  const json = (await res.json()) as { success: boolean; data: ContradoShipment };
  return json.success && json.data?.trackingId ? json.data : null;
}
