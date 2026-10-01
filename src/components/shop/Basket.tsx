'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { shopItems } from '@/lib/shop';
import { useBasket } from '@/lib/shop/basket';
import { buildOrderLines, isOwnTypeTee, variantLabel, toFreeShipping, subtotalPence, gbp } from '@/lib/shop/orders';
import { useAuth } from '@/contexts/AuthContext';
import { MEMBER_DISCOUNT } from '@/lib/members/price';
import { useOwnTypeOff, useShopRate } from '@/lib/shop/use-rate';
import { RUNNER_TEE_SLUG, runnerTee, teeColour } from '@/lib/shop/runner-tee';
import { OWN_TYPE_OFF_PENCE, payPence } from '@/lib/shop/tee-pricing';
import { typeById } from '@/lib/runner-quiz';
import { modelPhotos } from '@/lib/runner-quiz/models';
import MemberLine from './MemberLine';
import NewsletterCheckbox from '@/components/newsletter/NewsletterCheckbox';

export default function Basket() {
  const { lines, set } = useBasket();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  // Pre-ticked: a customer's soft opt-in (PECR). Subscribed only after payment, in the webhook.
  const [newsletter, setNewsletter] = useState(true);

  // Priced exactly as checkout prices them (orders.ts, tee-pricing.ts).
  const rows = lines.flatMap((l, index) => {
    const item = l.slug === RUNNER_TEE_SLUG ? runnerTee : shopItems.find((i) => i.slug === l.slug);
    const v = item?.variants.find((v) => v.id === l.variantId);
    let line;
    try {
      [line] = buildOrderLines([l]);
    } catch {
      return [];
    }
    const type = line.design ? typeById(line.design) : undefined;
    return item && v ? [{ ...l, index, item, v, type, line }] : [];
  });
  const { isAuthenticated } = useAuth();
  // £3 off one tee of your own type, once per account, signed in only (own-type.ts).
  const ownTypeOff = useOwnTypeOff();
  const offIndex = ownTypeOff ? (rows.find((r) => isOwnTypeTee(r.line))?.index ?? -1) : -1;
  const orderLines = rows.length ? buildOrderLines(rows.map((r) => lines[r.index]), undefined, { ownTypeOff }) : [];
  const hasTee = rows.some((r) => r.type);
  const subtotalP = subtotalPence(orderLines);
  const subtotal = subtotalP / 100;
  // The server's answer (same rule as checkout), so the basket shows exactly what Stripe charges.
  const serverRate = useShopRate();
  const rate = serverRate ?? 0;
  const club = rate > MEMBER_DISCOUNT;
  const payP = payPence(orderLines, rate);
  const discount = (subtotalP - payP) / 100;
  const teeHref = (r: (typeof rows)[number]) =>
    `/shop/${r.item.slug}?design=${r.type!.id}${r.line.personal ? `&type=${r.line.personal.type}&s=${r.line.personal.scores.join('-')}` : ''}`;

  const setQty = (index: number, q: number) =>
    set(lines.map((l, i) => (i === index ? { ...l, quantity: q } : l)).filter((l) => l.quantity > 0));

  const checkout = async () => {
    setBusy(true);
    setError(null);
    setPendingUrl(null);
    try {
      const res = await fetch('/api/shop/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines, newsletter }) });
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
          <li key={r.index} className="flex gap-4 p-4">
            {r.type ? (
              <Link href={teeHref(r)} className="relative w-20 h-20 rounded-lg bg-white overflow-hidden shrink-0" aria-label={r.type.shirt}>
                {/* Model shot 1 of this design in the line's colour. */}
                <Image src={modelPhotos(r.type.id, teeColour(r.v.id))[0]} alt="" fill sizes="160px" className="object-cover scale-[1.7] origin-[50%_45%]" />
              </Link>
            ) : (
              <Link href={`/shop/${r.item.slug}`} className="relative w-20 h-20 rounded-lg bg-white overflow-hidden shrink-0">
                {r.item.images[0] && <Image src={r.item.images[0].src} alt="" fill sizes="80px" className="object-cover" />}
              </Link>
            )}
            <div className="flex-1 min-w-0">
              <Link href={r.type ? teeHref(r) : `/shop/${r.item.slug}`} className="font-semibold text-foreground hover:text-brand line-clamp-2">
                {r.type ? `${r.item.name}: ${r.type.name}` : r.item.name}
              </Link>
              {r.type && (
                <p className="text-sm text-foreground">
                  &ldquo;{r.type.shirt}&rdquo;
                  {r.line.personal ? ' · your Runner DNA on the back' : ''}
                  {isOwnTypeTee(r.line) ? (r.index === offIndex ? ' · your type, £3 off one' : isAuthenticated ? ' · your type' : ' · your type, sign in for £3 off one') : ''}
                </p>
              )}
              <p className="text-sm text-secondary">{variantLabel(r.v)}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="inline-flex items-center rounded-lg border border-border">
                  <button type="button" aria-label="Fewer" onClick={() => setQty(r.index, r.quantity - 1)} className="p-1.5 hover:text-brand"><Minus className="w-4 h-4" /></button>
                  <span className="w-8 text-center font-mono text-sm">{r.quantity}</span>
                  <button type="button" aria-label="More" onClick={() => setQty(r.index, Math.min(10, r.quantity + 1))} className="p-1.5 hover:text-brand"><Plus className="w-4 h-4" /></button>
                </div>
                <button type="button" aria-label="Remove" onClick={() => setQty(r.index, 0)} className="p-1.5 text-muted hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="font-mono text-foreground">{gbp(r.line.unitPence * r.quantity - (r.index === offIndex ? OWN_TYPE_OFF_PENCE : 0))}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-secondary text-sm">Subtotal</p>
          <p className="font-mono text-2xl text-foreground">£{subtotal.toFixed(2)}</p>
          {rate > 0 ? (
            <p className="text-sm text-foreground">{club ? 'FMR Club discount' : 'Member discount'} <span className="font-mono">−£{discount.toFixed(2)}</span> · you pay <span className="font-mono">£{(subtotal - discount).toFixed(2)}</span> plus postage</p>
          ) : isAuthenticated || serverRate === null ? null : (
            hasTee ? (
              <p className="text-sm text-secondary mt-1">
                Members pay <span className="font-mono">{gbp(payPence(orderLines, MEMBER_DISCOUNT))}</span> ·{' '}
                <Link href="/login?callbackUrl=%2Fshop%2Fbasket" className="text-brand hover:underline">Sign in free</Link>
              </p>
            ) : (
              <MemberLine pounds={subtotal} />
            )
          )}
          {toFreeShipping(Math.round(subtotal * 100)) > 0 ? (
            <p className="text-xs text-muted mt-1">
              Spend <span className="font-mono text-foreground">£{(toFreeShipping(Math.round(subtotal * 100)) / 100).toFixed(2)}</span> more for free UK delivery.
              {rate > 0 ? ' Member discount applied at checkout.' : ''}
            </p>
          ) : (
            <p className="text-xs text-brand mt-1">
              Free UK delivery on this order.{rate > 0 ? ' Member discount applied at checkout.' : ''}
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
      <NewsletterCheckbox
        className="mt-4 sm:justify-end"
        checked={newsletter}
        onChange={setNewsletter}
        label="Send me the Film My Run newsletter (untick if you'd rather not)"
      />
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
