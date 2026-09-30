import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import RunnerTee from '@/components/shop/RunnerTee';
import { parseResult, parseScores } from '@/lib/runner-quiz';
import { SHIRT_COLOURS, type ShirtColour } from '@/lib/runner-quiz/shirt-art';

interface Props {
  searchParams: Promise<{ type?: string; s?: string; colour?: string }>;
}

export const metadata: Metadata = {
  title: 'Runner Type Tee | Shop',
  description:
    'Your runner type phrase on the front, your own Runner DNA from the Film My Run quiz on the back. Printed to order in the UK.',
  alternates: { canonical: 'https://filmmyrun.com/shop/runner-type-tee' },
};

export default async function RunnerTeePage({ searchParams }: Props) {
  const { type, s, colour } = await searchParams;
  // Same strict rule as checkout: the scores must point at the type.
  const r = parseResult({ type, scores: parseScores(s) });
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <RunnerTee
          typeId={r ? r.type.id : null}
          scores={r ? r.scores : null}
          colour={colour && colour in SHIRT_COLOURS ? (colour as ShirtColour) : undefined}
        />
      </main>
      <Footer />
    </>
  );
}
