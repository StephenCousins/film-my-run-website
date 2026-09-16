'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import ProductCard from './ProductCard';
import type { ShopCategory, ShopItem } from '@/lib/shop';

export default function ShopGrid({ items, categories }: { items: ShopItem[]; categories: ShopCategory[] }) {
  const [active, setActive] = useState<string>('all');
  const shown = active === 'all' ? items : items.filter((i) => i.category === active);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Product type">
        {[{ key: 'all', label: 'Everything', count: items.length }, ...categories].map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={active === c.key}
            onClick={() => setActive(c.key)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
              active === c.key
                ? 'bg-brand text-black border-brand'
                : 'bg-surface-secondary text-secondary border-border hover:text-foreground hover:border-foreground/30',
            )}
          >
            {c.label} <span className="opacity-60">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {shown.map((item, i) => (
          <ProductCard key={item.key} item={item} priority={i < 4} />
        ))}
      </div>
    </div>
  );
}
