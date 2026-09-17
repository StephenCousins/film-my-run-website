import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Basket from '@/components/shop/Basket';

export const metadata: Metadata = { title: 'Basket | Shop', robots: { index: false } };

export default function BasketPage() {
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <div className="container py-8 lg:py-12 max-w-3xl">
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-8">Your basket</h1>
          <Basket />
        </div>
      </main>
      <Footer />
    </>
  );
}
