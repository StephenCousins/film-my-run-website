'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ShopImage } from '@/lib/shop';

export default function ProductGallery({ images, current: src, onSelect, name }: { images: ShopImage[]; current?: string; onSelect: (img: ShopImage) => void; name: string }) {
  const current = images.find((i) => i.src === src) ?? images[0];
  if (!current) return null;

  return (
    <div>
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-border">
        <Image src={current.src} alt={name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 sm:grid-cols-6 gap-2">
          {images.map((img, i) => (
            <button
              key={img.src}
              onClick={() => onSelect(img)}
              aria-label={img.colour ? `${img.colour}, image ${i + 1}` : `View image ${i + 1}`}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden bg-white border-2 transition-colors',
                img.src === current.src ? 'border-brand' : 'border-border hover:border-foreground/40',
              )}
            >
              <Image src={img.src} alt="" fill sizes="10vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
