import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/db';
import { sanitizeContent } from '@/lib/sanitize';
import { flagEmoji } from '@/lib/runners/flag';
import { personJsonLd, storiesAbout } from '@/lib/runners/present';
import type { BestFinish, RunnerPhoto, RunnerSource } from '@/lib/runners/types';
import RunnerCard from '@/components/runners/RunnerCard';

export const dynamic = 'force-dynamic';

const DISCIPLINE: Record<string, string> = { trail_ultra: 'Trail & Ultra', road: 'Road', track: 'Track' };

async function getRunner(slug: string) {
  const r = await prisma.runners.findUnique({ where: { slug } });
  if (!r || r.status !== 'published') return null;
  return {
    slug: r.slug, name: r.name, nationality: r.nationality, disciplines: r.disciplines, era: r.era,
    bio: r.bio, bestFinishes: r.best_finishes as unknown as BestFinish[], sources: r.sources as unknown as RunnerSource[],
    photos: r.photos as unknown as RunnerPhoto[], utmbIndex: r.utmb_index, utmbIndexAt: r.utmb_index_at?.toISOString() ?? null,
    utmbUri: r.utmb_uri,
  };
}

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const r = await getRunner((await params).slug);
  if (!r) return { title: 'Runner not found', robots: { index: false, follow: true } }; // a 200 under the root loading.tsx, so noindex (see news/[slug])
  const description = r.bio.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155);
  const image = (r.photos.find((p) => p.kind === 'portrait') ?? r.photos[0])?.url;
  return {
    title: `${r.name}: runner profile and results`,
    description,
    alternates: { canonical: `https://filmmyrun.com/runners/${r.slug}` },
    openGraph: { title: r.name, description, type: 'profile', images: image ? [image] : [] },
  };
}

export default async function RunnerPage({ params }: PageProps) {
  const { slug } = await params;
  const r = await getRunner(slug);
  if (!r) notFound();
  const stories = await storiesAbout(slug);
  const portrait = r.photos.find((p) => p.kind === 'portrait');
  const action = r.photos.find((p) => p.kind === 'action');
  const flag = flagEmoji(r.nationality);
  const url = `https://filmmyrun.com/runners/${r.slug}`;
  const person = personJsonLd({ name: r.name, slug: r.slug, nationality: r.nationality, photos: r.photos, bioText: r.bio.replace(/<[^>]+>/g, ' '), sameAs: r.sources.map((s) => s.url).filter((u) => !u.includes('filmmyrun.com')) });
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://filmmyrun.com' },
    { '@type': 'ListItem', position: 2, name: 'Runners', item: 'https://filmmyrun.com/runners' },
    { '@type': 'ListItem', position: 3, name: r.name, item: url },
  ] };

  return (
    <>
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }} />
      <main className="pt-24 lg:pt-32 pb-16 bg-background">
        <div className="container max-w-5xl">
          <nav className="text-sm text-secondary mb-6"><Link href="/runners" className="hover:text-[#f88c00]">Runners</Link> / {r.name}</nav>
          <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
            <div>
              {portrait ? (
                <figure>
                  <div className="relative w-full aspect-square md:aspect-[4/5] max-w-[240px] md:max-w-none rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                    <Image
                      src={portrait.url}
                      alt={r.name}
                      fill
                      sizes="(min-width: 768px) 40vw, 240px"
                      className="object-cover object-top"
                    />
                  </div>
                  {portrait.credit.trim() && <figcaption className="text-xs text-secondary mt-2">{portrait.credit}</figcaption>}
                </figure>
              ) : <RunnerCard name={r.name} flag={flag} index={r.utmbIndex} className="aspect-square md:aspect-[4/5] max-w-[240px] md:max-w-none w-full rounded-2xl" />}
            </div>
            <div>
              <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground text-balance">{flag} {r.name}</h1>
              <p className="text-secondary mt-2">{r.disciplines.map((d) => DISCIPLINE[d] ?? d).join(' · ')}{r.era === 'historic' ? ' · Legend' : ''}</p>
              {r.utmbIndex !== null && r.utmbIndexAt && (
                <p className="mt-4 text-lg tabular-nums"><span className="font-bold text-[#f88c00]">UTMB Index {r.utmbIndex}</span> <span className="text-sm text-secondary">as of {new Date(r.utmbIndexAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
              )}
              <div className="prose dark:prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeContent(r.bio) }} />
            </div>
          </div>

          {action && (
            <figure className="mt-12">
              <div className="relative w-full aspect-[16/9] max-h-[560px] rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                <Image
                  src={action.url}
                  alt={`${r.name} racing`}
                  fill
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  className="object-cover object-top"
                />
              </div>
              {action.credit.trim() && <figcaption className="text-xs text-secondary mt-2">{action.credit}</figcaption>}
            </figure>
          )}

          {r.bestFinishes.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Best finishes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-left text-secondary border-b border-border"><th className="py-2 pr-4">Year</th><th className="py-2 pr-4">Race</th><th className="py-2 pr-4">Distance</th><th className="py-2 pr-4">Time</th><th className="py-2">Place</th></tr></thead>
                  <tbody>
                    {r.bestFinishes.map((b, i) => (
                      <tr key={i} className="border-b border-border/50"><td className="py-2 pr-4">{b.year}</td><td className="py-2 pr-4">{b.race}</td><td className="py-2 pr-4">{b.distance ?? ''}</td><td className="py-2 pr-4">{b.time ?? ''}</td><td className="py-2">{b.position ?? ''}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {stories.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">In the news</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {stories.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/news/${s.slug}`} className="flex gap-4 items-center group">
                      {s.imageUrl && (
                        <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800">
                          <Image src={s.imageUrl} alt="" fill sizes="112px" className="object-cover" />
                        </div>
                      )}
                      <span>
                        <span className="block text-xs text-secondary">{new Date(s.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="font-semibold text-foreground group-hover:text-[#f88c00]">{s.title}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12 text-sm text-secondary">
            <p>Sources: {r.sources.map((s, i) => (<span key={s.url}>{i ? ', ' : ''}<a href={s.url} rel="nofollow noopener" target="_blank" className="underline hover:text-[#f88c00]">{s.name}</a></span>))}</p>
            {r.photos.length > 0 && <p className="mt-2">Photographer? Ask us to remove or change a photo: news@filmmyrun.com</p>}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
