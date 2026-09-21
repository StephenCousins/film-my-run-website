import Image from 'next/image';
import Link from 'next/link';
import type { OrderDTO } from '@/lib/members/orders';
import { gbp } from '@/lib/shop/orders';

export const STATUS_LABEL: Record<OrderDTO['status'], string> = { paid: 'Paid', submitted: 'In production', shipped: 'Shipped' };

export function placed(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function OrderSummary({ order, link }: { order: OrderDTO; link?: boolean }) {
  const first = order.items[0];
  const title = order.items.length === 1 ? first.name : `${order.items.length} items`;
  const body = (
    <div className="flex gap-4 p-4">
      <div className="relative w-20 h-20 rounded-lg bg-white overflow-hidden shrink-0">
        {first?.imageUrl && <Image src={first.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-secondary">Order #{order.id} · {placed(order.placedAt)}</p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-brand/10 text-xs text-foreground">{STATUS_LABEL[order.status]}</span>
      </div>
      <p className="font-mono text-foreground">{gbp(order.totalPence)}</p>
    </div>
  );
  return link ? <Link href={`/account/orders/${order.id}`} className="block hover:bg-surface/60">{body}</Link> : body;
}
