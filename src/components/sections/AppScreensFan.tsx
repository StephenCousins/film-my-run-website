import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface AppScreen {
  src: string;
  alt: string;
}

// Three real screens from the Film My Run app, stacked, the middle one in front.
// The side two swing out on hover or keyboard focus; on touch screens, with no
// hover, they stay a little fanned so all three show.
const POSITIONS = [
  'z-0 -translate-x-[18%] -rotate-[6deg] group-hover:-translate-x-[80%] group-hover:-rotate-[12deg] group-focus:-translate-x-[80%] group-focus:-rotate-[12deg]',
  'z-10 group-hover:-translate-y-3 group-focus:-translate-y-3',
  'z-0 translate-x-[18%] rotate-[6deg] group-hover:translate-x-[80%] group-hover:rotate-[12deg] group-focus:translate-x-[80%] group-focus:rotate-[12deg]',
];

export default function AppScreensFan({ screens, label }: { screens: [AppScreen, AppScreen, AppScreen]; label: string }) {
  // Drawn left, right, then middle, so the middle one sits on top.
  const order = [0, 2, 1];
  return (
    <div className="flex justify-center py-6">
      <div className="group relative h-[440px] w-[210px] sm:h-[500px] sm:w-[240px]" tabIndex={0} aria-label={label}>
        {order.map((i) => (
          <div
            key={screens[i].src}
            className={cn(
              'absolute inset-0 rounded-[2rem] border-[5px] border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl',
              'transition-transform duration-500 ease-out motion-reduce:transition-none',
              POSITIONS[i]
            )}
          >
            <Image src={screens[i].src} alt={screens[i].alt} fill sizes="240px" className="object-cover object-top" />
          </div>
        ))}
        <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-orange-500 rounded-full scale-90" />
      </div>
    </div>
  );
}
