'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calculator, PlayCircle, ShoppingBag, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import MoreSheet from './MoreSheet';

// ============================================
// TAB DATA
// ============================================

const tabs = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Tools', href: '/tools/calculators', icon: Calculator },
  { name: 'Films', href: '/films', icon: PlayCircle },
  { name: 'Shop', href: '/shop', icon: ShoppingBag },
] as const;

// ============================================
// MOBILE TAB BAR COMPONENT
// ============================================

export default function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleCloseMore = useCallback(() => {
    setMoreOpen(false);
  }, []);

  // Check if a tab is active
  const isTabActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href.replace(/\/[^/]+$/, '') + '/');
  };

  // Check if "More" should be active (current page is in More sheet but not in tabs)
  const isMoreActive = moreOpen || (
    !tabs.some((tab) => isTabActive(tab.href)) && pathname !== '/'
  );

  return (
    <>
      {/* Tab Bar */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 lg:hidden',
          'bg-surface/95 backdrop-blur-lg',
          'border-t border-border/50'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.href);

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 w-full h-full transition-colors',
                  active ? 'text-brand' : 'text-muted'
                )}
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium leading-none">{tab.name}</span>
              </Link>
            );
          })}

          {/* More tab (button, not link) */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 w-full h-full transition-colors',
              isMoreActive ? 'text-brand' : 'text-muted'
            )}
          >
            <LayoutGrid className="w-6 h-6" strokeWidth={isMoreActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* More Sheet */}
      <MoreSheet isOpen={moreOpen} onClose={handleCloseMore} />
    </>
  );
}
