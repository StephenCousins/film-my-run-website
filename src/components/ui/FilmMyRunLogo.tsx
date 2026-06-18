'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================
// FILM STRIP SVG
// Official Film My Run logo — film strip design
// viewBox: 160 × 50
// ============================================

// Standard running figure path (24×24 viewBox, Material Design runner icon)
const RUNNER =
  'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z';

// SVG canvas
const W = 160;
const H = 50;

// Sprocket hole positions (8 per row)
const HOLE_XS = [4, 24, 44, 64, 84, 104, 124, 144];
const HOLE_W = 12;
const HOLE_H = 8;
const HOLE_TOP_Y = 2;
const HOLE_BOT_Y = H - HOLE_H - 2; // 40

// Three film frames
const FRAME_Y = 12;
const FRAME_H = H - 2 * FRAME_Y; // 26
const FRAMES = [
  { x: 4,   w: 46 },
  { x: 57,  w: 46 },
  { x: 110, w: 46 },
];

// Runner scale & centering inside each 46×26 frame
// Runner at scale 0.9 = 21.6×21.6 units
const S = 0.9;
const RS = 24 * S;           // rendered runner size ≈ 21.6
const PAD_X = (FRAMES[0].w - RS) / 2;  // ≈ 12.2
const PAD_Y = (FRAME_H - RS) / 2;      // ≈ 2.2

function FilmStrip({ height }: { height: number }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ height, width: 'auto', display: 'block' }}
      aria-hidden="true"
    >
      {/* Orange film strip background */}
      <rect x={0} y={0} width={W} height={H} rx={3} fill="#f88c00" />

      {/* Sprocket holes – top */}
      {HOLE_XS.map((x) => (
        <rect
          key={`t${x}`}
          x={x} y={HOLE_TOP_Y}
          width={HOLE_W} height={HOLE_H}
          rx={2}
          fill="rgba(0,0,0,0.45)"
        />
      ))}

      {/* Sprocket holes – bottom */}
      {HOLE_XS.map((x) => (
        <rect
          key={`b${x}`}
          x={x} y={HOLE_BOT_Y}
          width={HOLE_W} height={HOLE_H}
          rx={2}
          fill="rgba(0,0,0,0.45)"
        />
      ))}

      {/* Film frames */}
      {FRAMES.map((f, i) => (
        <rect key={i} x={f.x} y={FRAME_Y} width={f.w} height={FRAME_H} fill="#111" />
      ))}

      {/* Runner 1 – forward stride (left→right) */}
      <g transform={`translate(${FRAMES[0].x + PAD_X}, ${FRAME_Y + PAD_Y}) scale(${S})`}>
        <path d={RUNNER} fill="white" />
      </g>

      {/* Runner 2 – mirrored (right→left), same energy, opposite direction */}
      {/* translate to right edge of frame2, then flip horizontally */}
      <g transform={`translate(${FRAMES[1].x + FRAMES[1].w - PAD_X}, ${FRAME_Y + PAD_Y}) scale(${-S}, ${S})`}>
        <path d={RUNNER} fill="white" />
      </g>

      {/* Runner 3 – forward-leaning sprint, rotated around figure's centre */}
      <g transform={`translate(${FRAMES[2].x + FRAMES[2].w / 2}, ${FRAME_Y + FRAME_H / 2}) rotate(-12) translate(${-RS / 2}, ${-RS / 2}) scale(${S})`}>
        <path d={RUNNER} fill="white" />
      </g>
    </svg>
  );
}

// ============================================
// PUBLIC COMPONENT
// ============================================

interface FilmMyRunLogoProps {
  /** Visual size of the film strip */
  size?: 'sm' | 'md' | 'lg';
  /** Text colour: adapts to dark/light mode ('default') or forces white ('white') */
  textVariant?: 'default' | 'white';
  className?: string;
}

const STRIP_HEIGHTS = { sm: 28, md: 34, lg: 48 };
const TEXT_SIZES    = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };

export function FilmMyRunLogo({
  size = 'md',
  textVariant = 'default',
  className,
}: FilmMyRunLogoProps) {
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-3 group', className)}
    >
      {/* Film strip — scales up slightly on hover */}
      <span className="transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
        <FilmStrip height={STRIP_HEIGHTS[size]} />
      </span>

      {/* Site name */}
      <span
        className={cn(
          'font-display font-bold tracking-tight transition-colors duration-300',
          TEXT_SIZES[size],
          textVariant === 'white' ? 'text-white' : 'text-foreground',
        )}
      >
        Film My Run
      </span>
    </Link>
  );
}
