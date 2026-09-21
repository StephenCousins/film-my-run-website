import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { liveOrderDeps, toOrderDTO } from '@/lib/members/orders';
import { gbp } from '@/lib/shop/orders';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import OrderSummary from '@/components/account/OrderSummary';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order', robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  const n = Number(id);
  const row = Number.isInteger(n) ? await liveOrderDeps.orderById(n) : null;
  const order = row && row.user_id === userId ? toOrderDTO(row) : null;
  if (!order) notFound();
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 bg-background">
        <div className="container max-w-2xl">
          <Link href="/account/orders" className="text-sm text-muted hover:text-brand">&larr; Your orders</Link>
          <h1 className="text-3xl font-display font-bold text-foreground mt-4 mb-6">Order #{order.id}</h1>
          <div className="rounded-2xl bg-surface-secondary border border-border"><OrderSummary order={order} /></div>
          <ul className="mt-6 divide-y divide-border rounded-2xl bg-surface-secondary border border-border">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4 p-4">
                <div>
                  <p className="text-foreground">{it.quantity} × {it.name}</p>
                  {it.variant && <p className="text-sm text-secondary">{it.variant}</p>}
                </div>
                <p className="font-mono text-foreground">{gbp(it.pricePence * it.quantity)}</p>
              </li>
            ))}
            <li className="flex justify-between p-4"><p className="text-secondary">Total paid, including postage</p><p className="font-mono text-foreground">{gbp(order.totalPence)}</p></li>
          </ul>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex mt-6 px-6 py-3 rounded-xl bg-brand text-black font-semibold hover:bg-orange-400">Track parcel</a>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
