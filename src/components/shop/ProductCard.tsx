import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, swatch, type ShopItem } from '@/lib/shop';

export default function ProductCard({ item, priority = false }: { item: ShopItem; priority?: boolean }) {
  const [main, hover] = item.images;
  return (
    <Link
      href={`/shop/${item.slug}`}
      className="group block rounded-2xl bg-surface-secondary border border-border overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
    >
      <div className="relative aspect-square bg-white overflow-hidden">
        {main && (
          <Image
            src={main.src}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={hover ? 'object-cover transition-opacity duration-300 group-hover:opacity-0' : 'object-cover'}
          />
        )}
        {hover && (
          <Image
            src={hover.src}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider text-white">
          {item.categoryLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-brand transition-colors">
          {item.name}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-sm text-foreground">{formatPrice(item)}</span>
          {item.colours.length > 1 && (
            <span className="flex items-center gap-1" aria-label={`${item.colours.length} colours`}>
              {item.colours.slice(0, 6).map((c) => (
                <span
                  key={c}
                  title={c}
                  className="w-3 h-3 rounded-full border border-black/20"
                  style={{ backgroundColor: swatch[c] ?? '#888' }}
                />
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
