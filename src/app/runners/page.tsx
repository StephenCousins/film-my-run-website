import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/db';
import RunnersList from './RunnersList';
import { raceKey } from '@/lib/runners/present';
import type { BestFinish } from '@/lib/runners/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Runners: profiles, results and UTMB Index',
  description: 'Profiles of the best trail, ultra, road and track runners: short biographies, best finishes and the current UTMB Index.',
  alternates: { canonical: 'https://filmmyrun.com/runners' },
};

export default async function RunnersPage({ searchParams }: { searchParams: Promise<{ race?: string }> }) {
  // ?race= comes from the race names in a runner's best finishes: everyone else who raced it.
  const race = (await searchParams).race?.trim().slice(0, 120) || null;
  const rows = await prisma.runners.findMany({
    where: { status: 'published' },
    select: { slug: true, name: true, nationality: true, disciplines: true, era: true, utmb_index: true, photos: true, best_finishes: true },
    orderBy: [{ utmb_index: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
  });
  const key = race ? raceKey(race) : null;
  const runners = rows.filter((r) => !key || (r.best_finishes as unknown as BestFinish[]).some((b) => raceKey(b.race) === key)).map((r) => ({
    slug: r.slug, name: r.name, nationality: r.nationality, disciplines: r.disciplines, era: r.era, utmbIndex: r.utmb_index,
    photo: ((r.photos as unknown as { kind: string; url: string }[]).find((p) => p.kind === 'portrait') ?? null)?.url ?? null,
  }));
  return (
    <>
      <Header />
      <main className="pt-24 lg:pt-32 pb-16 bg-background">
        <div className="container">
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground">{race ? `Runners who raced ${race}` : 'Runners'}</h1>
          <p className="text-secondary mt-3 max-w-2xl">
            {race
              ? <>{runners.length} {runners.length === 1 ? 'runner' : 'runners'} with {race} in their best finishes. <Link href="/runners" className="underline hover:text-[#f88c00]">See every runner</Link></>
              : 'The runners we write about. Short biographies, their best finishes and, for trail runners, the current UTMB Index.'}
          </p>
          <RunnersList runners={runners} />
        </div>
      </main>
      <Footer />
    </>
  );
}
