import type { ReactNode } from 'react';

/**
 * The top of every Film My Run game (Nov 2026): a dark band with faint contour lines, the game's name,
 * and today's puzzle number on a race bib. Always dark, in both themes, so the games feel like their own corner
 * of the site. The game card below overlaps it (give it -mt-16 relative).
 */

/** Wobbly concentric rings, like a hill on an OS map. Deterministic, so server and client agree. */
function contourPath(cx: number, cy: number, r: number, k: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const wob = 1 + 0.09 * Math.sin(3 * t + k * 0.7) + 0.05 * Math.sin(5 * t - k) + 0.03 * Math.sin(9 * t + k * 2);
    pts.push(`${(cx + Math.cos(t) * r * wob * 1.35).toFixed(1)},${(cy + Math.sin(t) * r * wob).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

function Contours() {
  const hills = [
    { cx: 980, cy: 120, rings: 11, step: 34 },
    { cx: 180, cy: 330, rings: 8, step: 30 },
  ];
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {hills.map((h, hi) =>
        Array.from({ length: h.rings }, (_, k) => (
          <path key={`${hi}-${k}`} d={contourPath(h.cx, h.cy, 18 + k * h.step, k + hi * 5)} fill="none"
            stroke="#f88c00" strokeOpacity={k % 5 === 4 ? 0.28 : 0.12} strokeWidth={k % 5 === 4 ? 1.6 : 1} />
        ))
      )}
    </svg>
  );
}

export function RaceBib({ number, label }: { number: number | string; label: string }) {
  return (
    <div className="relative shrink-0 w-28 sm:w-36 -rotate-3 rounded-md bg-white text-zinc-900 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] overflow-hidden" aria-label={`${label} ${number}`}>
      <div className="bg-brand text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-center py-1">{label}</div>
      <div className="font-display font-bold text-4xl sm:text-5xl text-center tabular-nums py-2 sm:py-3 leading-none">{number}</div>
      {/* Safety pins */}
      {['top-6 left-1.5', 'top-6 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos) => (
        <span key={pos} className={`absolute ${pos} w-1.5 h-1.5 rounded-full bg-zinc-300 ring-1 ring-zinc-400`} />
      ))}
    </div>
  );
}

export default function GameHero({ eyebrow, title, subtitle, bib, compact, children }: {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  bib?: { number: number | string; label: string };
  /** On a game page: on phones, drop the subtitle and tighten the band so the board sits higher. */
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden bg-zinc-950 text-white ${compact ? 'pt-24 pb-20 sm:pt-28 sm:pb-24' : 'pt-28 pb-24'}`}>
      <Contours />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-zinc-950/60" aria-hidden />
      <div className="relative max-w-3xl mx-auto px-4 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight mt-2 text-balance">{title}</h1>
          <p className={`text-zinc-400 mt-2 max-w-md ${compact ? 'hidden sm:block' : ''}`}>{subtitle}</p>
          {children}
        </div>
        {bib && <RaceBib number={bib.number} label={bib.label} />}
      </div>
    </section>
  );
}
