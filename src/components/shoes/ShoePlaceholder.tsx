'use client';

export default function ShoePlaceholder({ brand }: { brand: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1e] relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-40" />

      <svg
        viewBox="0 0 160 80"
        className="w-36 h-[72px] relative z-10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="80" cy="68" rx="48" ry="4" className="fill-zinc-200 dark:fill-zinc-700" opacity="0.5" />

        {/* Outsole */}
        <path
          d="M20 58 C16 58, 12 57, 10 55 C8 53, 9 51, 12 50 L30 46 C34 45, 40 44, 48 44 L110 44 C118 44, 124 45.5, 130 48 C136 50.5, 140 53, 142 54.5 C144 56, 143 58, 140 58 Z"
          className="fill-zinc-700 dark:fill-zinc-400"
          opacity="0.8"
        />

        {/* Midsole */}
        <path
          d="M18 52 C18 52, 24 48, 36 46.5 C48 45, 72 44.5, 96 45.5 C120 46.5, 132 49, 138 51.5"
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* Upper shoe body */}
        <path
          d="M28 46 C28 46, 30 34, 36 28 C42 22, 50 18, 60 16 C70 14, 78 14, 86 16 C94 18, 100 22, 106 28 C112 34, 116 40, 118 43 C119 44.5, 118 45, 116 45 L48 45 C42 45, 34 45.5, 28 46 Z"
          className="fill-zinc-300 dark:fill-zinc-600"
          opacity="0.5"
        />

        {/* Shoe outline */}
        <path
          d="M28 46 C28 46, 30 34, 36 28 C42 22, 50 18, 60 16 C70 14, 78 14, 86 16 C94 18, 100 22, 106 28 C112 34, 116 40, 118 43"
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />

        {/* Collar opening */}
        <path
          d="M58 16 C58 16, 64 12, 72 11 C80 10, 88 12, 92 14"
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* Lace area */}
        <path d="M66 22 L76 18" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
        <path d="M68 26 L78 21" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
        <path d="M70 30 L80 25" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />

        {/* Swoosh-like detail */}
        <path
          d="M40 40 C50 34, 70 28, 100 32"
          className="stroke-orange-400 dark:stroke-orange-500"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.35"
        />

        {/* Heel counter */}
        <path
          d="M30 46 C30 42, 32 36, 36 32"
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />
      </svg>

      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mt-1.5 relative z-10">
        {brand}
      </span>
    </div>
  );
}
