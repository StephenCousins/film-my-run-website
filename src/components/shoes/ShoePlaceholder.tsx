'use client';

export default function ShoePlaceholder({ brand }: { brand: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800">
      <svg
        viewBox="0 0 120 60"
        className="w-28 h-14 text-zinc-300 dark:text-zinc-600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sole */}
        <path
          d="M12 48 C12 48, 8 48, 6 46 C4 44, 4 42, 6 41 L18 38 C20 37.5, 24 37, 28 37 L90 37 C96 37, 100 38, 104 40 C108 42, 112 44, 114 45 C116 46, 116 48, 114 48 Z"
          fill="currentColor"
          opacity="0.5"
        />
        {/* Upper */}
        <path
          d="M18 38 C18 38, 20 28, 24 24 C28 20, 34 17, 42 15 C50 13, 56 13, 62 14 C68 15, 72 17, 76 20 C80 23, 84 28, 88 33 C90 35, 91 36, 90 37 L28 37 C24 37, 20 37.5, 18 38 Z"
          fill="currentColor"
          opacity="0.35"
        />
        {/* Collar */}
        <path
          d="M42 15 C42 15, 46 12, 52 11 C58 10, 64 11, 68 13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.3"
        />
        {/* Lacing detail */}
        <path
          d="M48 20 L56 17 M50 24 L58 20 M52 28 L60 24"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.2"
        />
        {/* Midsole line */}
        <path
          d="M14 43 C14 43, 20 40, 30 39 C40 38, 60 38, 80 39 C100 40, 108 42, 112 44"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.25"
        />
      </svg>
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mt-2">
        {brand}
      </span>
    </div>
  );
}
