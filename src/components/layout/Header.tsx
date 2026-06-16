'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';
import UserMenu from '@/components/auth/UserMenu';

// ============================================
// NAVIGATION DATA
// ============================================

const navigation = [
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
    href: '/tools/calculators',
    children: [
      { name: 'Running Calculators', href: '/tools/calculators' },
      { name: 'Shoe Finder', href: '/tools/shoe-finder' },
      { name: 'How Fast Are You', href: '/tools/how-fast-am-i' },
      { name: 'Runner Quiz', href: '/tools/runner-quiz' },
      { name: 'Route Comparison', href: '/tools/route-comparison' },
      { name: 'Training Plan App', href: '/training' },
      { name: 'Discount Codes', href: '/discounts' },
    ],
  },
  {
    name: 'For Event Organisers',
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
  { name: 'Contact', href: '/contact' },
];

// Pages where the hero extends behind the header (no pt-20 gap)
const HERO_PAGES = ['/'];

// ============================================
// LOGO COMPONENT
// ============================================

function Logo({ variant }: { variant: 'default' | 'hero' | 'scrolled' }) {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <svg
            key={i}
            className={cn(
              'w-5 h-5 text-orange-500 transition-transform duration-300',
              'group-hover:scale-110',
              i === 0 && 'group-hover:-translate-x-0.5',
              i === 2 && 'group-hover:translate-x-0.5'
            )}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z" />
          </svg>
        ))}
      </div>
      <span className={cn(
        'font-display text-lg font-semibold transition-colors duration-300',
        variant === 'hero' ? 'text-white' : 'text-foreground'
      )}>
        Film My Run
      </span>
    </Link>
  );
}

// ============================================
// DESKTOP NAV
// ============================================

interface NavItemProps {
  item: typeof navigation[0];
  isActive: boolean;
  variant: 'default' | 'hero' | 'scrolled';
}

function DesktopNavItem({ item, isActive, variant }: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = 'children' in item && item.children;
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
            'flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors duration-300',
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
          <div className="bg-surface rounded-xl shadow-xl border border-border py-2 min-w-[200px]">
            {item.children?.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                role="menuitem"
                className="block px-4 py-2 text-sm text-secondary hover:text-brand hover:bg-surface-secondary"
                onClick={() => setIsOpen(false)}
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'px-3 py-2 text-sm font-medium transition-colors duration-300',
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
