import type { Metadata } from 'next';
import Link from 'next/link';
import RegisterForm from '@/components/auth/RegisterForm';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a Film My Run account to access all features',
};

export default function RegisterPage() {
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

          {/* Register Form */}
          <RegisterForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
