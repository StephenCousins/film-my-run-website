'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ShopImage } from '@/lib/shop';

export default function ProductGallery({ images, name }: { images: ShopImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
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
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden bg-white border-2 transition-colors',
                i === index ? 'border-brand' : 'border-border hover:border-foreground/40',
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
