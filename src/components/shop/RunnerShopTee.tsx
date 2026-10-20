import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, getShopItem } from '@/lib/shop';
import { christmasOn, GIFT_GUIDE_PATH, teeForRunner, type TeeRunner } from '@/lib/shop/christmas';

/** One slogan tee that fits this runner, at the foot of their page. */
export default function RunnerShopTee({ runner }: { runner: TeeRunner }) {
  const item = getShopItem(teeForRunner(runner));
  const photo = item?.images.find((i) => i.position === 'model') ?? item?.images[0];
  if (!item || !photo) return null;
  return (
    <section className="mt-12 rounded-2xl border border-border overflow-hidden grid sm:grid-cols-[200px_1fr]">
      <Link href={`/shop/${item.slug}`} className="relative block aspect-square sm:aspect-auto bg-white">
        <Image src={photo.src} alt={`${item.name} t-shirt`} fill sizes="(min-width: 640px) 200px, 100vw" className="object-cover" />
      </Link>
      <div className="p-5 lg:p-6 flex flex-col justify-center">
        <p className="text-xs uppercase tracking-wider text-secondary">From the Film My Run shop</p>
        <Link href={`/shop/${item.slug}`} className="font-display text-2xl font-bold text-foreground hover:text-[#f88c00] mt-1">{item.name}</Link>
        <p className="text-secondary mt-2 text-sm">Every phrase on these shirts was said out loud, on camera, somewhere between a start line and a finish line. Printed in the UK. {formatPrice(item)}.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={`/shop/${item.slug}`} className="px-4 py-2 rounded-full bg-[#f88c00] text-black font-semibold hover:opacity-90">See the tee</Link>
          {christmasOn() && <Link href={GIFT_GUIDE_PATH} className="px-4 py-2 rounded-full border border-border text-foreground hover:border-[#f88c00]">Christmas gift guide</Link>}
        </div>
      </div>
    </section>
  );
}
