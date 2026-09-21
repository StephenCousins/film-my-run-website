'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ShopImage } from '@/lib/shop';

export default function ProductGallery({ images, current: src, onSelect, name }: { images: ShopImage[]; current?: string; onSelect: (img: ShopImage) => void; name: string }) {
  const current = images.find((i) => i.src === src) ?? images[0];
  const index = images.indexOf(current);
  // Left/right arrows step through the strip, unless the user is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      const next = images[(index + (e.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length];
      if (next) onSelect(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images, index, onSelect]);
  if (!current) return null;

  return (
    <div>
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-border">
        {current.video ? (
          <video key={current.video} src={current.video} poster={current.src} autoPlay muted loop playsInline controls aria-label={name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Image src={current.src} alt={name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 sm:grid-cols-6 gap-2">
          {images.map((img, i) => (
            <button
              key={img.src}
              onClick={() => onSelect(img)}
              aria-label={`${img.colour ? `${img.colour}, ` : ''}${img.video ? 'video' : 'image'} ${i + 1}`}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden bg-white border-2 transition-colors',
                img.src === current.src ? 'border-brand' : 'border-border hover:border-foreground/40',
              )}
            >
              <Image src={img.src} alt="" fill sizes="10vw" className="object-cover" />
              {img.video && <span aria-hidden className="absolute inset-0 grid place-items-center text-white text-2xl drop-shadow">▶</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
