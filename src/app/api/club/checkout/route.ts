/** Starts a Stripe subscription checkout for the Club. Signed-in members only. */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe, siteUrl } from '@/lib/shop/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const id = Number(session?.user?.id);
  if (!email || !Number.isInteger(id)) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  }

  let interval: unknown;
  try {
    interval = (await request.json()).interval;
  } catch {
    interval = 'month';
  }
  const price = interval === 'year' ? process.env.STRIPE_CLUB_PRICE_YEAR : process.env.STRIPE_CLUB_PRICE_MONTH;
  if (!price) return NextResponse.json({ error: 'The Club is not on sale yet' }, { status: 503 });

  const user = await prisma.users.findUnique({ where: { id }, select: { stripe_customer_id: true } });
  const base = siteUrl();
  try {
    const checkout = await stripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      // One Stripe customer per account, so the portal and the webhook agree.
      ...(user?.stripe_customer_id ? { customer: user.stripe_customer_id } : { customer_email: email }),
      client_reference_id: String(id),
      // The webhook is the source of truth; this is only the belt to its braces.
      subscription_data: { metadata: { user_id: String(id), email } },
      metadata: { user_id: String(id), email },
      allow_promotion_codes: true,
      success_url: `${base}/club?joined=1`,
      cancel_url: `${base}/club`,
    });
    if (!checkout.url) return NextResponse.json({ error: 'Stripe gave no checkout URL' }, { status: 502 });
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    console.error('Club checkout failed:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
