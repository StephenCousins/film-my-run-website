/** Stripe → checkout.session.completed → place the order with Printify and email the buyer. */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/shop/stripe';
import { fulfilPaidSession, toPrintifyAddress } from '@/lib/shop/fulfil';
import { createOrder } from '@/lib/shop/printify';
import { orderConfirmation } from '@/lib/shop/email';
import type { OrderLine } from '@/lib/shop/orders';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get('stripe-signature');
  if (!secret || !sig) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Bad signature: ${(e as Error).message}` }, { status: 400 });
  }
  if (event.type !== 'checkout.session.completed') return NextResponse.json({ ignored: event.type });

  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email;
  const ship = session.shipping_details;
  if (!email || !ship?.address) {
    console.error('Shop webhook: session without email/address', session.id);
    return NextResponse.json({ error: 'No email or address' }, { status: 400 });
  }
  const address = toPrintifyAddress(ship.name, email, session.customer_details?.phone, ship.address);

  const result = await fulfilPaidSession(session.id, email, address, {
    load: async (id) => {
      const o = await prisma.orders.findFirst({ where: { stripe_session_id: id } });
      return o && { id: o.id, status: o.status, items: o.items as unknown as OrderLine[] };
    },
    markPaid: (id, email, a) => prisma.orders.update({ where: { id }, data: { status: 'paid', email, shipping_address: a as object, updated_at: new Date() } }).then(() => {}),
    placeWithPrintify: (o, a) =>
      createOrder(String(o.id), o.items.map((l) => ({ product_id: l.printifyProductId, variant_id: l.variantId, quantity: l.quantity })), a),
    markSubmitted: (id, printify_order_id) => prisma.orders.update({ where: { id }, data: { status: 'submitted', printify_order_id, updated_at: new Date() } }).then(() => {}),
    emailConfirmation: (o, to) => orderConfirmation(to, o.id, o.items, session.amount_total ?? 0),
  }).catch((e) => {
    // Stripe retries on non-2xx; the row is 'paid' so the retry will not double-order, but we want to know.
    console.error('Shop fulfilment failed for', session.id, e);
    throw e;
  });

  return NextResponse.json({ result });
}
