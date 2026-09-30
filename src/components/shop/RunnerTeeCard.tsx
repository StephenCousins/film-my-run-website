'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { QUIZ } from '@/lib/runner-quiz';
import { modelPhotos } from '@/lib/runner-quiz/models';
import { SHIRT_COLOURS } from '@/lib/runner-quiz/shirt-art';
import { runnerTee } from '@/lib/shop/runner-tee';
import { formatPrice } from '@/lib/shop';

/**
 * The Runner Type Tee as a card in the shop grid: a model photo of a random type's shirt,
 * picked after mount so the server and first client render agree (Fell Runner until then).
 * It opens the chooser of all 12 designs.
 */
export default function RunnerTeeCard() {
  const [typeId, setTypeId] = useState('fell');
  useEffect(() => setTypeId(QUIZ.types[Math.floor(Math.random() * QUIZ.types.length)].id), []);
  const type = QUIZ.types.find((t) => t.id === typeId)!;
  return (
    <Link
      href="/shop/runner-type-tee"
      className="group block rounded-2xl bg-surface-secondary border border-border overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
    >
      <div className="relative aspect-square bg-white overflow-hidden">
        <Image
          src={modelPhotos(type.id)[0]}
          alt={`${type.name} tee: ${type.shirt}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          // Closer on the shirt, so the phrase reads and the badge sits clear of the face.
          className="object-cover scale-[1.35] origin-[50%_62%]"
        />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-brand text-[11px] font-semibold uppercase tracking-wider text-black">
          Personalised
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-brand transition-colors">
          {runnerTee.name}: 12 designs
        </h3>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-sm text-foreground">{formatPrice(runnerTee)}</span>
          <span className="flex items-center gap-1" aria-label={`${runnerTee.colours.length} colours`}>
            {runnerTee.colours.map((c) => (
              <span key={c} title={c} className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: SHIRT_COLOURS[c as keyof typeof SHIRT_COLOURS] }} />
            ))}
          </span>
        </div>
      </div>
    </Link>
  );
}
