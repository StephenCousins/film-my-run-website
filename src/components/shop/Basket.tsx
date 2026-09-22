'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { shopItems } from '@/lib/shop';
import { useBasket } from '@/lib/shop/basket';
import { variantLabel, toFreeShipping } from '@/lib/shop/orders';
import { useAuth } from '@/contexts/AuthContext';
import { memberPrice } from '@/lib/members/price';
import MemberLine from './MemberLine';

export default function Basket() {
  const { lines, set } = useBasket();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const rows = lines.flatMap((l) => {
    const item = shopItems.find((i) => i.slug === l.slug);
    const v = item?.variants.find((v) => v.id === l.variantId);
    return item && v ? [{ ...l, item, v }] : [];
  });
  const subtotal = rows.reduce((s, r) => s + r.v.price * r.quantity, 0);
  const { isAuthenticated, hasAccess } = useAuth();
  const club = hasAccess('PRO');
  const discount = isAuthenticated ? Math.round((subtotal - memberPrice(subtotal, club)) * 100) / 100 : 0;

  const setQty = (slug: string, variantId: number | string, q: number) =>
    set(lines.map((l) => (l.slug === slug && l.variantId === variantId ? { ...l, quantity: q } : l)).filter((l) => l.quantity > 0));

  const checkout = async () => {
    setBusy(true);
    setError(null);
    setPendingUrl(null);
    try {
      const res = await fetch('/api/shop/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      if (isAuthenticated && data.member === false && data.reason) {
        setPendingUrl(data.url);
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-surface-secondary border border-border text-center">
        <p className="text-secondary">Nothing in here yet.</p>
        <Link href="/shop" className="inline-block mt-4 text-brand hover:underline">Back to the shop</Link>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-border rounded-2xl bg-surface-secondary border border-border">
        {rows.map((r) => (
          <li key={`${r.slug}-${r.variantId}`} className="flex gap-4 p-4">
            <Link href={`/shop/${r.item.slug}`} className="relative w-20 h-20 rounded-lg bg-white overflow-hidden shrink-0">
              {r.item.images[0] && <Image src={r.item.images[0].src} alt="" fill sizes="80px" className="object-cover" />}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/shop/${r.item.slug}`} className="font-semibold text-foreground hover:text-brand line-clamp-2">{r.item.name}</Link>
              <p className="text-sm text-secondary">{variantLabel(r.v)}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="inline-flex items-center rounded-lg border border-border">
                  <button type="button" aria-label="Fewer" onClick={() => setQty(r.slug, r.variantId, r.quantity - 1)} className="p-1.5 hover:text-brand"><Minus className="w-4 h-4" /></button>
                  <span className="w-8 text-center font-mono text-sm">{r.quantity}</span>
                  <button type="button" aria-label="More" onClick={() => setQty(r.slug, r.variantId, Math.min(10, r.quantity + 1))} className="p-1.5 hover:text-brand"><Plus className="w-4 h-4" /></button>
                </div>
                <button type="button" aria-label="Remove" onClick={() => setQty(r.slug, r.variantId, 0)} className="p-1.5 text-muted hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="font-mono text-foreground">£{(r.v.price * r.quantity).toFixed(2)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-secondary text-sm">Subtotal</p>
          <p className="font-mono text-2xl text-foreground">£{subtotal.toFixed(2)}</p>
          {isAuthenticated ? (
            <p className="text-sm text-foreground">{club ? 'Club discount' : 'Member discount'} <span className="font-mono">−£{discount.toFixed(2)}</span> · you pay <span className="font-mono">£{(subtotal - discount).toFixed(2)}</span> plus postage</p>
          ) : (
            <MemberLine pounds={subtotal} />
          )}
          {toFreeShipping(Math.round(subtotal * 100)) > 0 ? (
            <p className="text-xs text-muted mt-1">
              Spend <span className="font-mono text-foreground">£{(toFreeShipping(Math.round(subtotal * 100)) / 100).toFixed(2)}</span> more for free UK delivery.
              {isAuthenticated ? ' Member discount applied at checkout.' : ''}
            </p>
          ) : (
            <p className="text-xs text-brand mt-1">
              Free UK delivery on this order.{isAuthenticated ? ' Member discount applied at checkout.' : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={checkout}
          disabled={busy}
          className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-brand text-black font-semibold text-lg hover:bg-orange-400 transition-colors disabled:opacity-60"
        >
          {busy ? 'Taking you to checkout…' : 'Checkout'}
        </button>
      </div>
      {pendingUrl ? (
        <div className="mt-4 text-sm text-red-500">
          <p>Your member discount couldn&apos;t be applied. Sign in again, or continue at full price.</p>
          <button type="button" onClick={() => window.location.assign(pendingUrl)} className="mt-2 underline hover:no-underline">Continue anyway</button>
        </div>
      ) : (
        error && <p className="mt-4 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
