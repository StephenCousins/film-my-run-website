'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import ProductCard from './ProductCard';
import RunnerTeeCard from './RunnerTeeCard';
import { MemberOffer } from './MemberLine';
import { NewsletterPrompt } from '@/components/newsletter/NewsletterPrompt';
import type { ShopCategory, ShopItem } from '@/lib/shop';

/** One case for every chip: "Running T-Shirts" → "Running T-shirts". */
const chipLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/\bt-shirts\b/g, 'T-shirts');

export default function ShopGrid({ items, categories }: { items: ShopItem[]; categories: ShopCategory[] }) {
  const [active, setActive] = useState<string>('all');
  const shown = active === 'all' ? items : items.filter((i) => i.category === active);

  // The Runner Type Tee is a card of its own: after the running T-shirts, and first among the casual ones.
  const cards: ReactNode[] = shown.map((item, i) => <ProductCard key={item.key} item={item} priority={i < 4} />);
  if (active === 'all') {
    const lastRunningTee = shown.map((i) => i.category).lastIndexOf('running-tees');
    cards.splice(lastRunningTee + 1, 0, <RunnerTeeCard key="runner-type-tee" />);
  } else if (active === 'tees') {
    cards.unshift(<RunnerTeeCard key="runner-type-tee" />);
  }
  const withTee = (key: string) => (key === 'all' || key === 'tees' ? 1 : 0);

  // The member offer spans the grid after its first row: 2 cards on a phone, 3 on a tablet, 4 on desktop.
  const rows: [number, string][] = [
    [4, 'hidden xl:flex col-span-full'],
    [3, 'hidden md:flex xl:hidden col-span-full'],
    [2, 'md:hidden col-span-full'],
  ];
  for (const [after, className] of rows) {
    cards.splice(Math.min(after, cards.length), 0, <MemberOffer key={`offer-${after}`} className={className} />);
  }

  return (
    <div>
      {/* One row: scrolls sideways on a phone rather than wrapping into a block of pills. */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 w-max" role="tablist" aria-label="Product type">
          {[{ key: 'all', label: 'Everything', count: items.length }, ...categories].map((c) => {
            const on = active === c.key;
            return (
              <button
                key={c.key}
                role="tab"
                aria-selected={on}
                onClick={() => setActive(c.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-10 pl-3.5 pr-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  on
                    ? 'bg-brand text-black border-brand'
                    : 'bg-surface-secondary text-secondary border-border hover:text-foreground hover:border-foreground/30',
                )}
              >
                {chipLabel(c.label)}
                <span className={cn('min-w-6 px-1.5 rounded-full text-xs font-mono leading-5', on ? 'bg-black/15 text-black' : 'bg-border/60 text-muted')}>
                  {c.count + withTee(c.key)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Signed-in members only, once: the newsletter question. */}
      <NewsletterPrompt className="mb-8" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {cards}
      </div>
    </div>
  );
}
