/**
 * Stripe → the Club's subscription events → the account's tier.
 *
 * Its own endpoint and its own signing secret, so the shop's webhook (which
 * places orders and must not be disturbed) stays exactly as it was.
 */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/shop/stripe';
import { accessFor, mergeWithExisting } from '@/lib/club/subscription';

export const dynamic = 'force-dynamic';

/** Writes the tier for whichever account owns this Stripe customer. */
async function applyToAccount(userId: number | null, customerId: string | null, sub: Stripe.Subscription | null) {
  const where = userId ? { id: userId } : customerId ? { stripe_customer_id: customerId } : null;
  if (!where) return 'no account to write to';
  const user = await prisma.users.findFirst({ where, select: { id: true, access_tier: true, subscription_end: true } });
  if (!user) return 'account not found';

  const next = mergeWithExisting(
    accessFor(sub && { status: sub.status, currentPeriodEnd: sub.current_period_end, cancelAtPeriodEnd: sub.cancel_at_period_end }),
    { tier: user.access_tier, until: user.subscription_end },
  );
  await prisma.users.update({
    where: { id: user.id },
    data: {
      access_tier: next.tier,
      subscription_end: next.until,
      updated_at: new Date(),
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    },
  });
  return `user ${user.id} → ${next.tier}${next.until ? ` until ${next.until.toISOString()}` : ''}`;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_CLUB_WEBHOOK_SECRET;
  const sig = request.headers.get('stripe-signature');
  if (!secret || !sig) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode !== 'subscription') return NextResponse.json({ ignored: 'not a subscription' });
        const sub = await stripe().subscriptions.retrieve(String(s.subscription));
        const userId = Number(s.client_reference_id ?? s.metadata?.user_id);
        return NextResponse.json({ ok: await applyToAccount(Number.isInteger(userId) ? userId : null, String(s.customer), sub) });
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = Number(sub.metadata?.user_id);
        return NextResponse.json({ ok: await applyToAccount(Number.isInteger(userId) ? userId : null, String(sub.customer), sub) });
      }
      default:
        return NextResponse.json({ ignored: event.type });
    }
  } catch (e) {
    // A 500 makes Stripe retry, which is what we want for a transient failure.
    console.error('Club webhook failed:', event.type, e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
