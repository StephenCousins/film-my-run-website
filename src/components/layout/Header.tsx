'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';
import UserMenu from '@/components/auth/UserMenu';
import { FilmMyRunLogo } from '@/components/ui/FilmMyRunLogo';
import BasketLink from '@/components/shop/BasketLink';

// ============================================
// NAVIGATION DATA
// ============================================

interface NavLink { name: string; href: string; desc?: string }
interface NavEntry { name: string; href: string; children?: NavLink[]; groups?: { title: string; items: NavLink[] }[] }

// For Runners had grown to ten flat links (Nov 2026): now two labelled columns with a line each,
// and the games have their own top-level item.
const navigation: NavEntry[] = [
  {
    name: 'Stories',
    href: '/blog',
    children: [
      { name: 'Blog', href: '/blog' },
      { name: 'Films', href: '/films' },
      { name: 'Race Results', href: '/races' },
      { name: 'About', href: '/about' },
    ],
  },
  {
    name: 'For Runners',
    href: '/tools',
    groups: [
      {
        title: 'Race tools',
        items: [
          { name: 'Running Calculators', href: '/tools/calculators', desc: 'Pace, splits and race predictions' },
          { name: 'How Fast Are You', href: '/tools/how-fast-am-i', desc: 'Where your times rank in the UK' },
          { name: 'Route Comparison', href: '/tools/route-comparison', desc: 'Lay your GPX files side by side' },
          { name: 'StoneTracker', href: '/tools/stone-tracker', desc: 'Your UTMB Running Stones' },
        ],
      },
      {
        title: 'Kit & training',
        items: [
          { name: 'Shoe Finder', href: '/tools/shoe-finder', desc: 'The right shoe for your running' },
          { name: 'Training Plans', href: '/training', desc: 'Plans in the Film My Run app' },
          { name: 'Discount Codes', href: '/discounts', desc: 'Money off running kit' },
        ],
      },
    ],
  },
  {
    name: 'Games',
    href: '/games',
    children: [
      { name: 'RunGuessr', href: '/games/runguessr', desc: 'Guess the race from its course' },
      { name: 'Fartlex', href: '/games/fartlex', desc: 'The daily running word' },
      { name: 'Runner Quiz', href: '/tools/runner-quiz', desc: 'What kind of runner are you?' },
    ],
  },
  {
    name: 'For Events', // 'For Event Organisers' wrapped at 1024px once Games joined the bar; matches the phone menu
    href: '/services',
    children: [
      { name: 'All Services', href: '/services' },
      { name: 'POV Race Coverage', href: '/services/pov-race-coverage' },
      { name: 'Documentary Films', href: '/services/documentary-films' },
      { name: 'Social Media Coverage', href: '/services/social-media-coverage' },
      { name: 'Live Streaming', href: '/services/event-live-streaming' },
      { name: 'Master of Ceremonies', href: '/services/master-of-ceremonies' },
    ],
  },
  { name: 'News', href: '/news' },
  { name: 'Shop', href: '/shop' },
  { name: 'FMR Club', href: '/club' },
];

const SHOP_HREF = '/shop';

// Pages where the hero extends behind the header (no pt-20 gap)
// Pages that open on a dark band, so the header starts in white text. The games share GameHero (Nov 2026).
const HERO_PAGES = ['/', '/games', '/games/runguessr', '/games/fartlex'];

// ============================================
// LOGO COMPONENT
// ============================================

function Logo({ variant }: { variant: 'default' | 'hero' | 'scrolled' }) {
  return (
    <FilmMyRunLogo
      size="md"
      priority
      variant={variant === 'hero' ? 'onDark' : 'auto'}
    />
  );
}

// ============================================
// DESKTOP NAV
// ============================================

function MenuLink({ link, onPick }: { link: NavLink; onPick: () => void }) {
  return (
    <Link href={link.href} role="menuitem" onClick={onPick}
      className={cn('block rounded-lg px-3 py-2 hover:bg-surface-secondary group', link.desc ? '' : 'px-4 rounded-none')}>
      <span className="block text-sm font-medium text-foreground group-hover:text-brand">{link.name}</span>
      {link.desc && <span className="block text-xs text-muted mt-0.5">{link.desc}</span>}
    </Link>
  );
}

interface NavItemProps {
  item: NavEntry;
  isActive: boolean;
  variant: 'default' | 'hero' | 'scrolled';
}

function DesktopNavItem({ item, isActive, variant }: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = !!(item.children || item.groups);
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    clearTimeout(closeTimeout.current);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    closeTimeout.current = setTimeout(() => setIsOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => clearTimeout(closeTimeout.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const textClass = isActive
    ? 'text-brand'
    : variant === 'hero'
      ? 'text-white/80 hover:text-white'
      : variant === 'scrolled'
        ? 'text-secondary hover:text-brand'
        : 'text-foreground hover:text-brand';

  if (hasChildren) {
    return (
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={open}
        onMouseLeave={close}
      >
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen((prev) => !prev);
            }
          }}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className={cn(
            'flex items-center gap-1 px-2 xl:px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300',
            textClass
          )}
        >
          {item.name}
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        <div
          className={cn(
            'absolute top-full left-0 pt-2 transition-all duration-200',
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          )}
          role="menu"
        >
          {item.groups ? (
            <div className="bg-surface rounded-xl shadow-xl border border-border p-3 grid grid-cols-2 gap-x-2 w-[520px]">
              {item.groups.map((g) => (
                <div key={g.title}>
                  <p className="px-3 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">{g.title}</p>
                  {g.items.map((child) => <MenuLink key={child.href} link={child} onPick={() => setIsOpen(false)} />)}
                </div>
              ))}
              <Link href={item.href} role="menuitem" onClick={() => setIsOpen(false)}
                className="col-span-2 mt-2 pt-3 px-3 border-t border-border text-sm font-semibold text-brand hover:underline">
                All tools →
              </Link>
            </div>
          ) : (
            <div className={cn('bg-surface rounded-xl shadow-xl border border-border', item.children?.some((c) => c.desc) ? 'p-2 w-[280px]' : 'py-2 min-w-[200px]')}>
              {item.children?.map((child) => <MenuLink key={child.href} link={child} onPick={() => setIsOpen(false)} />)}
              {item.children?.some((c) => c.desc) && (
                <Link href={item.href} role="menuitem" onClick={() => setIsOpen(false)}
                  className="block mt-1 pt-2 px-3 pb-1 border-t border-border text-sm font-semibold text-brand hover:underline">
                  All {item.name.toLowerCase()} →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // The shop is the one nav link that sells: an orange pill, on every header variant.
  if (item.href === SHOP_HREF) {
    return (
      <Link
        href={item.href}
        className={cn(
          'mx-1 px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-full bg-[#f88c00] text-white shadow-sm transition-colors duration-300 hover:bg-[#ff9f1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f88c00]',
          isActive && 'bg-[#e07800]'
        )}
      >
        {item.name}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'px-2 xl:px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300',
        textClass
      )}
    >
      {item.name}
    </Link>
  );
}

// ============================================
// MAIN HEADER COMPONENT
// ============================================

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isHeroPage = HERO_PAGES.includes(pathname);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const variant: 'default' | 'hero' | 'scrolled' = isScrolled
    ? 'scrolled'
    : isHeroPage
      ? 'hero'
      : 'default';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-surface/80 backdrop-blur-lg border-b border-border/50'
          : 'bg-transparent'
      )}
    >
      <div className="container">
        <nav className="flex items-center justify-between h-14 lg:h-20">
          <Logo variant={variant} />

          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <DesktopNavItem key={item.name} item={item} isActive={isActive} variant={variant} />
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <BasketLink />
            <div className="hidden lg:block">
              <ThemeToggle isScrolled={isScrolled} isHeroPage={isHeroPage} />
            </div>
            <div className="hidden lg:block">
              <UserMenu isScrolled={isScrolled} isHeroPage={isHeroPage} />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
