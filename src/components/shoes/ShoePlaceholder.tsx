'use client';

export default function ShoePlaceholder({ brand }: { brand: string }) {
  return (
    <div className="w-full h-full relative flex items-center justify-center bg-[#f0f1f3]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/shoe-placeholder.png"
        alt="Image not available"
        className="w-full h-full object-contain"
      />
      <span className="absolute bottom-2 left-0 right-0 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
        {brand}
      </span>
    </div>
  );
}
