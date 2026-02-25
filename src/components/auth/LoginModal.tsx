'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  feature = 'running calculators',
}: LoginModalProps) {
  const pathname = usePathname();
  const callbackUrl = encodeURIComponent(pathname);

  // Prevent body scroll when modal is open
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-border p-8 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-brand/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-brand" />
          </div>

          <h2 className="font-display text-xl font-bold text-foreground mb-2">
            Create a free account
          </h2>

          <p className="text-secondary mb-8">
            Sign up for free to use our {feature}. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/register?callbackUrl=${callbackUrl}`}
              className="w-full sm:w-auto px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-hover transition-colors text-center"
            >
              Create Free Account
            </Link>
            <Link
              href={`/login?callbackUrl=${callbackUrl}`}
              className="w-full sm:w-auto px-6 py-3 bg-surface-tertiary text-foreground font-semibold rounded-xl hover:bg-surface-secondary transition-colors text-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
