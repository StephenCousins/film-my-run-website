'use client';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useBasket } from '@/lib/shop/basket';

export default function BasketLink() {
  const { count } = useBasket();
  if (count === 0) return null;
  return (
    <Link href="/shop/basket" aria-label={`Basket, ${count} items`} className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
      <ShoppingBag className="w-5 h-5 text-zinc-400" />
      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-black text-[11px] font-bold flex items-center justify-center">{count}</span>
    </Link>
  );
}
