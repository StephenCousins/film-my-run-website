'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        {/* Message */}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
          Something Went Wrong
        </h1>
        <p className="text-zinc-400 mb-8">
          We hit an unexpected hurdle. Don&apos;t worry, even the best runners
          stumble sometimes. Let&apos;s get you back on track.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-left">
            <p className="text-sm font-mono text-red-600 dark:text-red-400 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-500/70 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-700 rounded-full hover:border-orange-500 transition-colors text-zinc-300"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>

        {/* Support link */}
        <p className="mt-8 text-sm text-zinc-500">
          If this keeps happening,{' '}
          <Link href="/contact" className="text-orange-500 hover:underline">
            let us know
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
