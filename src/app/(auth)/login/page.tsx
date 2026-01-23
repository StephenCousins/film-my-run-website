import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Film My Run account',
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 bg-zinc-50 dark:bg-zinc-950">
        <div className="container">
          {/* Back link */}
          <div className="mb-8">
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-orange-500 transition-colors"
            >
              &larr; Back to home
            </Link>
          </div>

          {/* Login Form */}
          <Suspense
            fallback={
              <div className="w-full max-w-md mx-auto">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 animate-pulse">
                  <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mx-auto mb-4" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2 mx-auto mb-8" />
                  <div className="space-y-4">
                    <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
