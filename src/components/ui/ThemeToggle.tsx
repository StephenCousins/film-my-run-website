'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'dropdown';
}

export default function ThemeToggle({
  className,
  showLabel = false,
  variant = 'button',
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, theme, setTheme } = useTheme();

  if (variant === 'dropdown') {
    return (
      <div className={cn('relative group', className)}>
        <button
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="w-5 h-5 text-zinc-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
        </button>

        {/* Dropdown menu */}
        <div className="absolute right-0 top-full mt-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[140px]">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
              theme === 'light' && 'text-orange-500'
            )}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
              theme === 'dark' && 'text-orange-500'
            )}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
              theme === 'system' && 'text-orange-500'
            )}
          >
            <Monitor className="w-4 h-4" />
            System
          </button>
        </div>
      </div>
    );
  }

  // Simple button toggle
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
        className
      )}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-500" />
      ) : (
        <Moon className="w-5 h-5 text-zinc-400" />
      )}
      {showLabel && (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
