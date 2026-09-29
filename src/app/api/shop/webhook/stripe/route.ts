/** Stripe → checkout.session.completed → place the order with Printify and email the buyer. */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/shop/stripe';
import { fulfilPaidSession, toPrintifyAddress } from '@/lib/shop/fulfil';
import { createOrder } from '@/lib/shop/printify';
import { createContradoOrder } from '@/lib/shop/contrado';
import { orderConfirmation, orderFailed } from '@/lib/shop/email';
import type { OrderLine } from '@/lib/shop/orders';
import { printifyLineItems, printKey } from '@/lib/shop/runner-tee-print';
import { renderPng, logoDataUri } from '@/lib/runner-quiz/render';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { SHIRT_COLOURS } from '@/lib/runner-quiz/shirt-art';
import { teeColour } from '@/lib/shop/runner-tee';

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
  const paidAt = new Date();

  const result = await fulfilPaidSession(session.id, email, address, {
    load: async (id) => {
      const o = await prisma.orders.findFirst({ where: { stripe_session_id: id } });
      return o && { id: o.id, status: o.status, items: o.items as unknown as OrderLine[] };
    },
    markPaid: (id, email, a) => prisma.orders.update({ where: { id }, data: { status: 'paid', email, shipping_address: a as object, total_cents: session.amount_total ?? undefined, updated_at: new Date() } }).then(() => {}),
    place: (supplier, lines, o, a) =>
      supplier === 'printify'
        ? printifyLineItems(o.id, o.items, lines, {
            render: (svg) => renderPng(svg, 4500),
            upload: (key, png) => uploadToR2(key, png, 'image/png'),
            logo: logoDataUri,
            paidAt,
          }).then((items) => createOrder(String(o.id), items, a))
        : createContradoOrder(`FMR-${o.id}`, lines, a),
    markSubmitted: (id, ids) =>
      prisma.orders.update({ where: { id }, data: { status: 'submitted', printify_order_id: ids.printify ?? null, contrado_order_id: ids.contrado ?? null, updated_at: new Date() } }).then(() => {}),
    flagFailed: async (id, e, ids) => {
      await prisma.orders.update({ where: { id }, data: { status: 'failed', printify_order_id: ids.printify ?? null, contrado_order_id: ids.contrado ?? null, updated_at: new Date() } });
      await orderFailed(id, e.message, ids).catch((err) => console.error('Owner alert email failed', err));
    },
    emailConfirmation: (o, to) => {
      const previews = o.items.flatMap((l, i) =>
        l.personal ? [{ src: getR2Url(printKey(o.id, i, 'back')), background: SHIRT_COLOURS[teeColour(l.variantId)] }] : []
      );
      return orderConfirmation(to, o.id, o.items, session.amount_total ?? 0, previews);
    },
  }).catch((e) => {
    // Stripe retries on non-2xx; the row is 'failed' (flagged, owner emailed) so the retry will not double-order.
    console.error('Shop fulfilment failed for', session.id, e);
    throw e;
  });

  return NextResponse.json({ result });
}
