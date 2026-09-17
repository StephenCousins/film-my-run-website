'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, ShoppingBag } from 'lucide-react';
import { swatch, etsyLink, type ShopItem } from '@/lib/shop';
import { addToBasket } from '@/lib/shop/basket';

const sized = (s: string | null) => s && s !== 'One size';

export default function BuyBox({ item }: { item: ShopItem }) {
  const colours = useMemo(() => [...new Set(item.variants.map((v) => v.colour).filter(Boolean))] as string[], [item]);
  const [colour, setColour] = useState<string | null>(colours[0] ?? null);
  const sizes = useMemo(
    () => [...new Set(item.variants.filter((v) => v.colour === colour).map((v) => v.size).filter(sized))] as string[],
    [item, colour],
  );
  const [size, setSize] = useState<string | null>(null);
  const chosenSize = sizes.length === 0 ? null : sizes.includes(size ?? '') ? size : null;
  const variant = item.variants.find((v) => v.colour === colour && (sizes.length === 0 || v.size === chosenSize));
  const [added, setAdded] = useState(false);

  const add = () => {
    if (!variant) return;
    addToBasket(item.slug, variant.id);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div>
      <p className="font-mono text-2xl text-foreground mt-5">£{(variant ?? item.variants[0]).price.toFixed(2)}</p>

      {colours.length > 0 && (
        <div className="mt-6">
          <p className="text-sm text-secondary mb-2">Colour: <span className="text-foreground">{colour}</span></p>
          <div className="flex flex-wrap gap-2">
            {colours.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColour(c)}
                aria-pressed={c === colour}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${c === colour ? 'border-brand bg-brand/10 text-foreground' : 'border-border bg-surface-secondary text-secondary hover:text-foreground'}`}
              >
                <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: swatch[c] ?? '#888' }} />
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-secondary mb-2">Size{chosenSize ? '' : ' — choose one'}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={s === chosenSize}
                className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-colors ${s === chosenSize ? 'border-brand bg-brand/10 text-foreground' : 'border-border bg-surface-secondary text-secondary hover:text-foreground'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={add}
        disabled={!variant}
        className="mt-8 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl bg-brand text-black font-semibold text-lg hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {added ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
        {added ? 'Added to basket' : 'Add to basket'}
      </button>
      <p className="text-xs text-muted mt-3">
        {added ? <Link href="/shop/basket" className="text-brand hover:underline">Go to basket →</Link> : 'UK postage calculated at checkout. Paid securely with Stripe.'}
        {item.etsyUrl && (
          <>
            {' · '}
            <a href={etsyLink(item.etsyUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
              Or buy on Etsy <ExternalLink className="w-3 h-3" />
            </a>
          </>
        )}
      </p>
    </div>
  );
}
