'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Route,
  Crown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserMenu() {
  const { user, status, signOut, hasAccess } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (status === 'loading') {
    return (
      <div className="w-9 h-9 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-orange-500 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition-colors"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const getTierBadge = () => {
    if (hasAccess('PRO')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
          <Crown className="w-3 h-3" />
          PRO
        </span>
      );
    }
    if (hasAccess('PREMIUM')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full">
          <Crown className="w-3 h-3" />
          Premium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium rounded-full">
        Free
      </span>
    );
  };

  const handleSignOut = () => {
    setIsOpen(false);
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 p-1.5 rounded-full transition-colors',
          'hover:bg-zinc-100 dark:hover:bg-zinc-800',
          isOpen && 'bg-zinc-100 dark:bg-zinc-800'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || 'User avatar'}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium text-sm">
            {user.name?.charAt(0).toUpperCase() ||
              user.email?.charAt(0).toUpperCase()}
          </div>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-zinc-500 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        className={cn(
          'absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-200 z-50',
          isOpen
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-2'
        )}
      >
        {/* User Info */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || 'User avatar'}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                {user.name?.charAt(0).toUpperCase() ||
                  user.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-900 dark:text-white truncate">
                {user.name || 'User'}
              </p>
              <p className="text-sm text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-2">{getTierBadge()}</div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <Link
            href="/tools/route-comparison"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Route className="w-4 h-4" />
            Route Comparison
          </Link>
          <Link
            href="/account"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <User className="w-4 h-4" />
            My Account
          </Link>
          <Link
            href="/account/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>

        {/* Upgrade CTA for free users */}
        {!hasAccess('PREMIUM') && (
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              className="block w-full py-2 text-center bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}

        {/* Sign Out */}
        <div className="py-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
