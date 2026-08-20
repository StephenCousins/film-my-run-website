'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================
// FILM MY RUN LOGO
// Official brand lockup: orange film strip with three runners,
// "Film My Run" wordmark beneath.
//
// Two artwork variants ship in /public/images/logo:
//   fmr-logo-light.png → dark runner silhouettes, for LIGHT backgrounds
//   fmr-logo-dark.png  → white runner silhouettes, for DARK backgrounds
//
// Both files are transparent PNGs, 1000 × 444 (aspect ≈ 2.2523).
// The wordmark is part of the artwork, so no separate text is rendered.
// ============================================

const LOGO_FOR_LIGHT_BG = '/images/logo/fmr-logo-light.png';
const LOGO_FOR_DARK_BG = '/images/logo/fmr-logo-dark.png';

// Intrinsic pixel dimensions of the source artwork (used by next/image)
const INTRINSIC_W = 1000;
const INTRINSIC_H = 444;

// Rendered heights — width is derived automatically from the aspect ratio
const SIZE_CLASSES = {
  sm: 'h-8 lg:h-9',    // 32px → 36px
  md: 'h-10 lg:h-14',  // 40px → 56px
  lg: 'h-14 lg:h-16',  // 56px → 64px
} as const;

type LogoSize = keyof typeof SIZE_CLASSES;

interface FilmMyRunLogoProps {
  /** Visual size of the logo lockup */
  size?: LogoSize;
  /**
   * Which artwork to use:
   *  'auto'   → follows the site theme (light/dark)
   *  'onDark' → always the white-runner version (e.g. over a dark hero image)
   *  'onLight'→ always the dark-runner version
   */
  variant?: 'auto' | 'onDark' | 'onLight';
  /** Render as a link to the homepage (default true) */
  asLink?: boolean;
  /** Preload — set true for the header logo (above the fold) */
  priority?: boolean;
  className?: string;
}

function LogoImage({
  src,
  sizeClass,
  extraClass,
  priority,
}: {
  src: string;
  sizeClass: string;
  extraClass?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt="Film My Run"
      width={INTRINSIC_W}
      height={INTRINSIC_H}
      priority={priority}
      className={cn('w-auto object-contain', sizeClass, extraClass)}
    />
  );
}

export function FilmMyRunLogo({
  size = 'md',
  variant = 'auto',
  asLink = true,
  priority = false,
  className,
}: FilmMyRunLogoProps) {
  const sizeClass = SIZE_CLASSES[size];

  // Both variants are rendered and toggled with CSS so there is no
  // theme flash and no hydration mismatch. `hidden` is display:none,
  // so screen readers only ever announce the visible one.
  const artwork =
    variant === 'onDark' ? (
      <LogoImage src={LOGO_FOR_DARK_BG} sizeClass={sizeClass} priority={priority} />
    ) : variant === 'onLight' ? (
      <LogoImage src={LOGO_FOR_LIGHT_BG} sizeClass={sizeClass} priority={priority} />
    ) : (
      <>
        <LogoImage
          src={LOGO_FOR_LIGHT_BG}
          sizeClass={sizeClass}
          extraClass="block dark:hidden"
          priority={priority}
        />
        <LogoImage
          src={LOGO_FOR_DARK_BG}
          sizeClass={sizeClass}
          extraClass="hidden dark:block"
          priority={priority}
        />
      </>
    );

  const inner = (
    <span className="inline-flex items-center transition-transform duration-300 group-hover:scale-105">
      {artwork}
    </span>
  );

  if (!asLink) {
    return <span className={cn('inline-flex items-center group', className)}>{inner}</span>;
  }

  return (
    <Link
      href="/"
      aria-label="Film My Run — home"
      className={cn('inline-flex items-center group flex-shrink-0', className)}
    >
      {inner}
    </Link>
  );
}
