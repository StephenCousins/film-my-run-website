import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import RunnerTee from '@/components/shop/RunnerTee';
import { parseResult, parseScores, typeById } from '@/lib/runner-quiz';
import { SHIRT_COLOURS, type ShirtColour } from '@/lib/runner-quiz/shirt-art';

interface Props {
  searchParams: Promise<{ design?: string; type?: string; s?: string; colour?: string }>;
}

export const metadata: Metadata = {
  title: 'Runner Type Tee | Shop',
  description:
    'Twelve runner type phrases. Your own Runner DNA from the Film My Run quiz on the back, and £3 off your own type. Printed to order in the UK.',
  alternates: { canonical: 'https://filmmyrun.com/shop/runner-type-tee' },
};

export default async function RunnerTeePage({ searchParams }: Props) {
  const { design, type, s, colour } = await searchParams;
  // The buyer's result: same strict rule as checkout, the scores must point at the type.
  const r = parseResult({ type, scores: parseScores(s) });
  // The shirt: any of the 12; an old link without a design is the buyer's own type. None: the chooser.
  const shirt = typeById(design) ?? r?.type;
  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        <RunnerTee
          designId={shirt?.id ?? null}
          personal={r}
          colour={colour && colour in SHIRT_COLOURS ? (colour as ShirtColour) : undefined}
        />
      </main>
      <Footer />
    </>
  );
}
