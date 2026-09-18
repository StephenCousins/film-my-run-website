'use client';
import { useState, type ReactNode } from 'react';
import ProductGallery from '@/components/shop/ProductGallery';
import BuyBox, { itemColours } from '@/components/shop/BuyBox';
import type { ShopImage, ShopItem } from '@/lib/shop';

/** Gallery and buy box share the chosen colour, so the photos follow the picker. */
export default function ProductPurchase({ item, children }: { item: ShopItem; children: ReactNode }) {
  const [colour, setColour] = useState<string | null>(itemColours(item)[0] ?? null);
  const [src, setSrc] = useState(item.images[0]?.src);
  // Every image is a thumbnail, in catalogue order so the strip never shifts. Picking a colour
  // jumps to its first photo, and picking another colour's photo moves the picker to match.
  const images = item.images;
  const pickColour = (c: string | null) => {
    setColour(c);
    setSrc((item.images.find((i) => i.colour === c) ?? item.images[0])?.src);
  };
  const pickImage = (i: ShopImage) => {
    setSrc(i.src);
    if (i.colour && i.colour !== colour) setColour(i.colour);
  };

  return (
    <>
      <ProductGallery images={images} current={src} onSelect={pickImage} name={colour ? `${item.name} in ${colour}` : item.name} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">{item.productType}</p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground leading-tight">{item.name}</h1>
        {item.subtitle && <p className="text-secondary mt-2">{item.subtitle}</p>}
        <BuyBox item={item} colour={colour} setColour={pickColour} />
        {children}
      </div>
    </>
  );
}
