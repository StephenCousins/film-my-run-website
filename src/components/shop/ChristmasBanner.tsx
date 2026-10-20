import Link from 'next/link';
import { Gift } from 'lucide-react';
import { christmasOn, GIFT_GUIDE_PATH, LAST_ORDER_ABROAD, LAST_ORDER_UK, orderByLabel } from '@/lib/shop/christmas';

/** The last order dates across the shop until the UK date passes. Pages showing it revalidate hourly. */
export default function ChristmasBanner({ guideLink = true }: { guideLink?: boolean }) {
  if (!christmasOn()) return null;
  return (
    <div className="bg-[#f88c00] text-black">
      <div className="container py-2.5 text-sm flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
        <span className="inline-flex items-center gap-2 font-semibold"><Gift className="w-4 h-4" /> Christmas: order tees, hoodies and totes by {orderByLabel(LAST_ORDER_UK)} for UK delivery.</span>
        <span>Caps, mugs and posters by {orderByLabel(LAST_ORDER_ABROAD)}.</span>
        {guideLink && <Link href={GIFT_GUIDE_PATH} className="underline font-semibold">Gift guide</Link>}
      </div>
    </div>
  );
}
