'use client';
import { useState, type ReactNode } from 'react';
import ProductGallery from '@/components/shop/ProductGallery';
import BuyBox, { itemColours } from '@/components/shop/BuyBox';
import type { ShopItem } from '@/lib/shop';

/** Gallery and buy box share the chosen colour, so the photos follow the picker. */
export default function ProductPurchase({ item, children }: { item: ShopItem; children: ReactNode }) {
  const [colour, setColour] = useState<string | null>(itemColours(item)[0] ?? null);
  const images = item.images.filter((i) => !i.colour || i.colour === colour);

  return (
    <>
      <ProductGallery key={colour} images={images} name={colour ? `${item.name} in ${colour}` : item.name} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">{item.productType}</p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground leading-tight">{item.name}</h1>
        {item.subtitle && <p className="text-secondary mt-2">{item.subtitle}</p>}
        <BuyBox item={item} colour={colour} setColour={setColour} />
        {children}
      </div>
    </>
  );
}
