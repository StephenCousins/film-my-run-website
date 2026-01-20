'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Number */}
        <div className="relative mb-8">
          <span className="font-mono text-[12rem] font-bold text-zinc-100 dark:text-zinc-900 leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Search className="w-12 h-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
          Page Not Found
        </h1>
        <p className="text-zinc-400 mb-8">
          Looks like this page went for a run and never came back.
          It might have been moved, deleted, or maybe it never existed.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-700 rounded-full hover:border-orange-500 transition-colors text-zinc-300"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Helpful links */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <p className="text-sm text-zinc-500 mb-4">Maybe try one of these:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'Blog', href: '/blog' },
              { name: 'Calculators', href: '/tools/calculators' },
              { name: 'Races', href: '/races' },
              { name: 'Shop', href: '/shop' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm bg-zinc-900 rounded-full hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
