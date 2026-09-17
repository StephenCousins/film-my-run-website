/** The three Printify calls the shop needs. Token and shop id come from the merch project's account. */
import { createHmac, timingSafeEqual } from 'crypto';

const BASE = 'https://api.printify.com/v1';

export interface PrintifyAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
}

export interface PrintifyLine {
  product_id: string;
  variant_id: number;
  quantity: number;
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) throw new Error('PRINTIFY_API_TOKEN not set');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Printify ${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

const shop = () => {
  const id = process.env.PRINTIFY_SHOP_ID;
  if (!id) throw new Error('PRINTIFY_SHOP_ID not set');
  return id;
};

/** Printify's shipping profiles are per country, so any UK address quotes the same. */
export const UK_QUOTE_ADDRESS: PrintifyAddress = {
  first_name: 'Quote', last_name: 'Quote', email: 'quote@filmmyrun.com', phone: '0',
  country: 'GB', region: '', address1: '1 High Street', city: 'London', zip: 'SW1A 1AA',
};

export async function quoteShippingPence(line_items: PrintifyLine[], address_to = UK_QUOTE_ADDRESS): Promise<number> {
  const q = await call<{ standard: number }>('POST', `/shops/${shop()}/orders/shipping.json`, { line_items, address_to });
  return q.standard;
}

export async function createOrder(external_id: string, line_items: PrintifyLine[], address_to: PrintifyAddress): Promise<string> {
  const r = await call<{ id: string }>('POST', `/shops/${shop()}/orders.json`, {
    external_id,
    label: `filmmyrun.com ${external_id}`,
    line_items,
    shipping_method: 1,
    send_shipping_notification: false,
    address_to,
  });
  await call('POST', `/shops/${shop()}/orders/${r.id}/send_to_production.json`);
  return r.id;
}

/** Webhook header x-pfy-signature = sha256=HMAC-SHA256(secret, raw body). */
export function verifyPrintifySignature(body: string, header: string | null, secret: string) {
  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  return !!header && header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
