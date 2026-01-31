'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';
import UserMenu from '@/components/auth/UserMenu';

// ============================================
// NAVIGATION DATA
// ============================================

const navigation = [
  {
    name: 'For Runners',
    href: '/tools/calculators',
    children: [
      { name: 'Running Calculators', href: '/tools/calculators' },
      { name: 'How Fast Are You', href: '/tools/how-fast-am-i' },
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
  { name: 'Live', href: '/live' },
  { name: 'Contact', href: '/contact' },
];

// ============================================
// LOGO COMPONENT
// ============================================

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      {/* Three running figures icon */}
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
      <span className="font-display text-lg font-semibold text-foreground">
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
}

function DesktopNavItem({ item, isActive }: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = 'children' in item && item.children;

  if (hasChildren) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button
          className={cn(
            'flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'text-brand'
              : 'text-secondary hover:text-brand'
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

        {/* Dropdown */}
        <div
          className={cn(
            'absolute top-full left-0 pt-2 transition-all duration-200',
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          )}
        >
          <div className="bg-surface rounded-xl shadow-xl border border-border py-2 min-w-[200px]">
            {item.children?.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="block px-4 py-2 text-sm text-secondary hover:text-brand hover:bg-surface-secondary"
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
        'px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'text-brand'
          : 'text-secondary hover:text-brand'
      )}
    >
      {item.name}
    </Link>
  );
}

// ============================================
// MOBILE NAV
// ============================================

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-full max-w-sm bg-background z-50 lg:hidden',
          'transform transition-transform duration-300 ease-out-expo',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Logo />
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-secondary text-secondary hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const hasChildren = 'children' in item && item.children;

            return (
              <div key={item.name}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'block px-4 py-3 rounded-lg text-base font-medium transition-colors',
                    isActive
                      ? 'text-brand bg-brand-muted'
                      : 'text-secondary hover:bg-surface-secondary'
                  )}
                >
                  {item.name}
                </Link>

                {hasChildren && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className="block px-4 py-2 text-sm text-muted hover:text-brand"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border space-y-4">
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-4">
            <span className="text-sm text-secondary">Theme</span>
            <ThemeToggle variant="dropdown" />
          </div>

          {/* Shop CTA */}
          <Link
            href="/shop"
            onClick={onClose}
            className="block w-full py-3 text-center bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </>
  );
}

// ============================================
// MAIN HEADER COMPONENT
// ============================================

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <DesktopNavItem key={item.name} item={item} isActive={isActive} />
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* User Menu - Desktop */}
            <div className="hidden lg:block">
              <UserMenu />
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-full hover:bg-surface-secondary text-secondary hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Navigation */}
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  );
}
