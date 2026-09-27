import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/db';
import RunnersList from './RunnersList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Runners: profiles, results and UTMB Index',
  description: 'Profiles of the best trail, ultra, road and track runners: short biographies, best finishes and the current UTMB Index.',
  alternates: { canonical: 'https://filmmyrun.com/runners' },
};

export default async function RunnersPage() {
  const rows = await prisma.runners.findMany({
    where: { status: 'published' },
    select: { slug: true, name: true, nationality: true, disciplines: true, era: true, utmb_index: true, photos: true },
    orderBy: [{ utmb_index: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
  });
  const runners = rows.map((r) => ({
    slug: r.slug, name: r.name, nationality: r.nationality, disciplines: r.disciplines, era: r.era, utmbIndex: r.utmb_index,
    photo: ((r.photos as unknown as { kind: string; url: string }[]).find((p) => p.kind === 'portrait') ?? null)?.url ?? null,
  }));
  return (
    <>
      <Header />
      <main className="pt-24 lg:pt-32 pb-16 bg-background">
        <div className="container">
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground">Runners</h1>
          <p className="text-secondary mt-3 max-w-2xl">The runners we write about. Short biographies, their best finishes and, for trail runners, the current UTMB Index.</p>
          <RunnersList runners={runners} />
        </div>
      </main>
      <Footer />
    </>
  );
}
