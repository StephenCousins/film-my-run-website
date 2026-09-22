/**
 * POST { lines: [{ slug, variantId, quantity }] } → { url } for Stripe Checkout.
 * Creates a pending `orders` row first so the webhook has something to flip.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildOrderLines, subtotalPence, linesFor, contradoShippingPence, returnUrls, shippingToCharge } from '@/lib/shop/orders';
import { quoteShippingPence } from '@/lib/shop/printify';
import { stripe, siteUrl } from '@/lib/shop/stripe';
import { currentMember } from '@/lib/members/current';
import { memberCheckout } from '@/lib/members/checkout';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let lines;
  let source: unknown;
  try {
    const body = await request.json();
    source = body.source;
    lines = buildOrderLines(body.lines);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    // Each supplier posts its own parcel: Printify quotes live, Contrado is a fixed UK rate.
    const printifyLines = linesFor(lines, 'printify');
    const contradoCount = linesFor(lines, 'contrado').reduce((n, l) => n + l.quantity, 0);
    const supplierShipping =
      (printifyLines.length
        ? await quoteShippingPence(printifyLines.map((l) => ({ product_id: l.supplierProductId, variant_id: Number(l.variantId), quantity: l.quantity })))
        : 0) + contradoShippingPence(contradoCount);
    // We still pay the supplier; the buyer does not, over the threshold.
    const shippingPence = shippingToCharge(subtotalPence(lines), supplierShipping);
    const total = subtotalPence(lines) + shippingPence;
    const { member, hadBearer, pro } = await currentMember(request);
    const mc = memberCheckout(member, hadBearer, { member: process.env.STRIPE_MEMBER_COUPON, club: process.env.STRIPE_CLUB_COUPON }, pro);
    const order = await prisma.orders.create({
      data: { status: 'pending', total_cents: total, currency: 'GBP', items: lines as object[], updated_at: new Date(), ...mc.orderFields },
    });

    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      discounts: mc.discounts,
      client_reference_id: String(order.id),
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: l.unitPence,
          product_data: { name: l.variantLabel ? `${l.name} (${l.variantLabel})` : l.name, images: l.image ? [l.image] : [] },
        },
      })),
      shipping_address_collection: { allowed_countries: ['GB'] },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: shippingPence === 0 ? 'Free UK delivery' : 'Royal Mail, printed to order',
          fixed_amount: { amount: shippingPence, currency: 'gbp' },
          delivery_estimate: { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 7 } },
        },
      }],
      phone_number_collection: { enabled: false },
      ...returnUrls(siteUrl(), source),
    });

    await prisma.orders.update({ where: { id: order.id }, data: { stripe_session_id: session.id, updated_at: new Date() } });
    return NextResponse.json({ url: session.url, ...mc.response });
  } catch (e) {
    console.error('Shop checkout failed:', e);
    return NextResponse.json({ error: 'Checkout is not available right now. Please try again shortly.' }, { status: 500 });
  }
}
