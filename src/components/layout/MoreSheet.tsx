'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';

// ============================================
// MORE SHEET NAVIGATION DATA
// ============================================

const sheetSections = [
  {
    title: 'For Runners',
    links: [
      { name: 'Running Calculators', href: '/tools/calculators' },
      { name: 'How Fast Are You', href: '/tools/how-fast-am-i' },
      { name: 'Route Comparison', href: '/tools/route-comparison' },
      { name: 'Training Plans', href: '/training' },
      { name: 'Discount Codes', href: '/discounts' },
      { name: 'Parkrun Stats', href: '/tools/parkrun' },
      { name: 'Race Map', href: '/tools/race-map' },
    ],
  },
  {
    title: 'For Events',
    links: [
      { name: 'All Services', href: '/services' },
      { name: 'POV Race Coverage', href: '/services/pov-race-coverage' },
      { name: 'Documentary Films', href: '/services/documentary-films' },
      { name: 'Social Media Coverage', href: '/services/social-media-coverage' },
      { name: 'Live Streaming', href: '/services/event-live-streaming' },
      { name: 'Master of Ceremonies', href: '/services/master-of-ceremonies' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { name: 'Blog', href: '/blog' },
      { name: 'News', href: '/news' },
      { name: 'Races', href: '/races' },
      { name: 'Live', href: '/live' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  },
];

// ============================================
// MORE SHEET COMPONENT
// ============================================

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MoreSheet({ isOpen, onClose }: MoreSheetProps) {
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when sheet is open
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

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

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

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 lg:hidden',
          'bg-surface rounded-t-3xl',
          'transform transition-transform duration-300 ease-out',
          'max-h-[85vh] flex flex-col',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-border-secondary rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-border flex-shrink-0">
          <h2 className="font-display text-lg font-semibold text-foreground">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-surface-secondary text-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {sheetSections.map((section) => (
            <div key={section.title} className="mb-6 last:mb-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.links.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center h-12 px-4 rounded-xl text-base transition-colors',
                        isActive
                          ? 'text-brand bg-brand-muted font-medium'
                          : 'text-secondary hover:bg-surface-secondary'
                      )}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Theme toggle row */}
          <div className="flex items-center justify-between h-12 px-4 mt-2 mb-2">
            <span className="text-sm text-secondary">Theme</span>
            <ThemeToggle variant="dropdown" />
          </div>
        </div>

        {/* Safe area spacer for iPhone home indicator */}
        <div className="flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </>
  );
}
