'use client';

export default function ShoePlaceholder({ brand: _brand }: { brand: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#f0f1f3]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/shoe-placeholder.png"
        alt="Image not available"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
