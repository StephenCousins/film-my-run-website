'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import ProductCard from './ProductCard';
import type { ShopCategory, ShopItem } from '@/lib/shop';

/** One case for every chip: "Running T-Shirts" → "Running T-shirts". */
const chipLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/\bt-shirts\b/g, 'T-shirts');

export default function ShopGrid({ items, categories }: { items: ShopItem[]; categories: ShopCategory[] }) {
  const [active, setActive] = useState<string>('all');
  const shown = active === 'all' ? items : items.filter((i) => i.category === active);

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
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-surface-secondary text-secondary border-border hover:text-foreground hover:border-foreground/30',
                )}
              >
                {chipLabel(c.label)}
                <span className={cn('min-w-6 px-1.5 rounded-full text-xs font-mono leading-5', on ? 'bg-brand text-black' : 'bg-border/60 text-muted')}>
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {shown.map((item, i) => (
          <ProductCard key={item.key} item={item} priority={i < 4} />
        ))}
      </div>
    </div>
  );
}
