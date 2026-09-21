import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { liveOrderDeps, toOrderDTO, type OrderDTO } from '@/lib/members/orders';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import OrderSummary from '@/components/account/OrderSummary';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your orders', robots: { index: false } };

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  const rows = Number.isInteger(userId) ? await liveOrderDeps.ordersFor(userId) : [];
  const orders = rows.map(toOrderDTO).filter((o): o is OrderDTO => o !== null);
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 bg-background">
        <div className="container max-w-2xl">
          <h1 className="text-3xl font-display font-bold text-foreground mb-6">Your orders</h1>
          {orders.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-secondary border border-border text-center">
              <p className="text-secondary">Nothing yet. Your first order will appear here.</p>
              <Link href="/shop" className="inline-block mt-4 text-brand hover:underline">Go to the shop</Link>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-2xl bg-surface-secondary border border-border">
              {orders.map((o) => <li key={o.id}><OrderSummary order={o} link /></li>)}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
