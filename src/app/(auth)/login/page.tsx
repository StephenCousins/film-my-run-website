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
      <main className="min-h-screen pt-24 pb-16 bg-background">
        <div className="container">
          {/* Back link */}
          <div className="mb-8">
            <Link
              href="/"
              className="text-sm text-muted hover:text-brand transition-colors"
            >
              &larr; Back to home
            </Link>
          </div>

          {/* Login Form */}
          <Suspense
            fallback={
              <div className="w-full max-w-md mx-auto">
                <div className="bg-surface rounded-2xl shadow-xl border border-border p-8 animate-pulse">
                  <div className="h-8 bg-surface-secondary rounded w-3/4 mx-auto mb-4" />
                  <div className="h-4 bg-surface-secondary rounded w-1/2 mx-auto mb-8" />
                  <div className="space-y-4">
                    <div className="h-12 bg-surface-secondary rounded" />
                    <div className="h-12 bg-surface-secondary rounded" />
                    <div className="h-12 bg-surface-secondary rounded" />
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
