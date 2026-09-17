import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ClearBasket from '@/components/shop/ClearBasket';
import { stripe } from '@/lib/shop/stripe';

export const metadata: Metadata = { title: 'Thanks | Shop', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let email: string | null = null;
  let paid = false;
  if (session_id) {
    try {
      const s = await stripe().checkout.sessions.retrieve(session_id);
      email = s.customer_details?.email ?? null;
      paid = s.payment_status === 'paid';
    } catch { /* show the generic message */ }
  }
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-16 max-w-2xl text-center">
          {paid && <ClearBasket />}
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground">{paid ? 'Thanks. That’s ordered.' : 'Thanks'}</h1>
          <p className="text-secondary mt-4 leading-relaxed">
            {paid
              ? <>It’s printed to order in the UK and usually dispatched in 2 to 5 working days. A confirmation is on its way to <span className="text-foreground">{email}</span>, and you’ll get tracking when it ships.</>
              : 'If you completed a payment, your confirmation email will arrive shortly.'}
          </p>
          <Link href="/shop" className="inline-block mt-8 text-brand hover:underline">Back to the shop</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
