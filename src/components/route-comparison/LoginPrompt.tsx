'use client';

import Link from 'next/link';
import { Lock, Route, BarChart2, Map } from 'lucide-react';

interface LoginPromptProps {
  feature?: string;
}

export default function LoginPrompt({ feature = 'Route Comparison' }: LoginPromptProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Lock className="w-8 h-8 text-orange-500" />
        </div>

        <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white mb-3">
          Sign in to access {feature}
        </h1>

        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          Create a free account to compare your running routes, analyze your
          performance, and track your progress.
        </p>

        {/* Features list */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <Route className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
              Compare Routes
            </p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <BarChart2 className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
              Analyze Splits
            </p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <Map className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
              View on Map
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            Create Free Account
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          No credit card required. Free accounts include full Route Comparison
          access.
        </p>
      </div>
    </div>
  );
}
