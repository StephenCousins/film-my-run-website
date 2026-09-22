/** Stripe's billing portal: change the card, switch plan, or cancel. */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe, siteUrl } from '@/lib/shop/stripe';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);
  const id = Number(session?.user?.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  const user = await prisma.users.findUnique({ where: { id }, select: { stripe_customer_id: true } });
  if (!user?.stripe_customer_id) return NextResponse.json({ error: 'No subscription to manage' }, { status: 404 });

  try {
    // Its own configuration, not the account default: Adrian's subscriptions
    // live on this Stripe account too and must not be offered Club prices.
    const configuration = process.env.STRIPE_CLUB_PORTAL_CONFIG;
    const portal = await stripe().billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${siteUrl()}/club`,
      ...(configuration ? { configuration } : {}),
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error('Club portal failed:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
