import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import RunnerTee from '@/components/shop/RunnerTee';
import { parseScores, typeById } from '@/lib/runner-quiz';

interface Props {
  searchParams: Promise<{ type?: string; s?: string }>;
}

export const metadata: Metadata = {
  title: 'Runner Type Tee | Shop',
  description:
    'Your runner type phrase on the front, your own Runner DNA from the Film My Run quiz on the back. Printed to order in the UK.',
  alternates: { canonical: 'https://filmmyrun.com/shop/runner-type-tee' },
};

export default async function RunnerTeePage({ searchParams }: Props) {
  const { type, s } = await searchParams;
  const t = typeById(type);
  const scores = parseScores(s);
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <RunnerTee typeId={t && scores ? t.id : null} scores={t && scores ? scores : null} />
      </main>
      <Footer />
    </>
  );
}
