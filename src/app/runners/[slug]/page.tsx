import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/db';
import { sanitizeContent } from '@/lib/sanitize';
import { flagEmoji } from '@/lib/runners/flag';
import { bornLine, filmsForFinishes, personJsonLd, runnerTitle, similarRunners, storiesAbout, youtubeId } from '@/lib/runners/present';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import type { BestFinish, RunnerPhoto, RunnerSource } from '@/lib/runners/types';
import type { PersonalBest } from '@/lib/runners/pbs';
import RunnerCard from '@/components/runners/RunnerCard';

export const dynamic = 'force-dynamic';

const DISCIPLINE: Record<string, string> = { trail_ultra: 'Trail & Ultra', road: 'Road', track: 'Track' };
const country = (iso2: string | null) => { try { return iso2 ? new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(iso2.toUpperCase()) ?? null : null; } catch { return null; } };
const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** Every other published runner, for "Similar runners". */
async function getOthers() {
  const rows = await prisma.runners.findMany({
    where: { status: 'published' },
    select: { slug: true, name: true, nationality: true, sex: true, disciplines: true, era: true, utmb_index: true, best_finishes: true, results: true, photos: true },
  });
  return rows.map((r) => ({
    slug: r.slug, name: r.name, nationality: r.nationality, sex: r.sex, disciplines: r.disciplines, era: r.era, utmbIndex: r.utmb_index,
    races: [...(r.best_finishes as unknown as BestFinish[]), ...(r.results as unknown as BestFinish[])].map((b) => b.race),
    photo: (r.photos as unknown as RunnerPhoto[]).find((p) => p.kind === 'portrait')?.url ?? null,
  }));
}

/** Stephen's own race films (the /races table). */
async function getFilms() {
  const rows = await prisma.races.findMany({ where: { video_url: { not: null } }, select: { event: true, video_url: true, date: true } });
  return rows.map((r) => ({ event: r.event, url: r.video_url!, date: r.date.toISOString().slice(0, 10) }));
}

async function getRunner(slug: string) {
  const r = await prisma.runners.findUnique({ where: { slug } });
  if (!r || r.status !== 'published') return null;
  return {
    slug: r.slug, name: r.name, nationality: r.nationality, disciplines: r.disciplines, era: r.era, sex: r.sex, birthYear: r.birth_year, updatedAt: r.updated_at.toISOString(),
    bio: r.bio, bestFinishes: r.best_finishes as unknown as BestFinish[], results: r.results as unknown as BestFinish[], personalBests: r.personal_bests as unknown as PersonalBest[], sources: r.sources as unknown as RunnerSource[],
    photos: r.photos as unknown as RunnerPhoto[], utmbIndex: r.utmb_index, utmbIndexAt: r.utmb_index_at?.toISOString() ?? null,
    utmbUri: r.utmb_uri,
  };
}

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const r = await getRunner((await params).slug);
  if (!r) return { title: 'Runner not found', robots: { index: false, follow: true } }; // a 200 under the root loading.tsx, so noindex (see news/[slug])
  // Facts first: they answer the search ("how old is", "nationality") right in the snippet.
  const facts = [country(r.nationality), bornLine(r.birthYear, r.era)?.replace(/^Born \d+ \((.*)\)$/, '$1').replace(/^Born/, 'born'), r.utmbIndex !== null ? `UTMB Index ${r.utmbIndex}` : null].filter(Boolean).join(', ');
  const bioText = r.bio.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const description = (facts ? `${r.name} (${facts}). ${bioText}` : bioText).slice(0, 155);
  const image = (r.photos.find((p) => p.kind === 'portrait') ?? r.photos[0])?.url;
  return {
    title: runnerTitle(r.name, r.era === 'historic' ? null : r.birthYear, r.utmbIndex), // no "age" for legends: some have died
    description,
    alternates: { canonical: `https://filmmyrun.com/runners/${r.slug}` },
    openGraph: { title: r.name, description, type: 'profile', images: image ? [image] : [] },
  };
}

export default async function RunnerPage({ params }: PageProps) {
  const { slug } = await params;
  const r = await getRunner(slug);
  if (!r) notFound();
  const flag = flagEmoji(r.nationality);
  const [stories, others, films] = await Promise.all([storiesAbout(slug), getOthers(), getFilms()]);
  const similar = similarRunners({ ...r, races: [...r.bestFinishes, ...r.results].map((b) => b.race) }, others) as typeof others;
  const raceFilms = filmsForFinishes([...r.bestFinishes, ...r.results], films);
  const born = bornLine(r.birthYear, r.era);
  const facts: [string, string][] = [
    ...(born ? [['Born', born.replace(/^Born /, '')] as [string, string]] : []),
    ...(country(r.nationality) ? [['Country', `${flag} ${country(r.nationality)}`] as [string, string]] : []),
    ['Runs', r.disciplines.map((d) => DISCIPLINE[d] ?? d).join(', ') + (r.era === 'historic' ? ' (legend)' : '')],
    ...(r.utmbIndex !== null && r.utmbIndexAt ? [['UTMB Index', `${r.utmbIndex} (${longDate(r.utmbIndexAt)})`] as [string, string]] : []),
  ];
  const portrait = r.photos.find((p) => p.kind === 'portrait');
  const action = r.photos.find((p) => p.kind === 'action');
  const url = `https://filmmyrun.com/runners/${r.slug}`;
  const person = personJsonLd({ name: r.name, slug: r.slug, nationality: r.nationality, birthYear: r.birthYear, photos: r.photos, bioText: r.bio.replace(/<[^>]+>/g, ' '), sameAs: r.sources.map((s) => s.url).filter((u) => !u.includes('filmmyrun.com')) });
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
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm rounded-xl border border-border p-4 tabular-nums">
                {facts.map(([k, v]) => (<div key={k} className="contents"><dt className="text-secondary">{k}</dt><dd className={`text-foreground ${k === 'UTMB Index' ? 'font-bold text-[#f88c00]' : ''}`}>{v}</dd></div>))}
              </dl>
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

          {r.personalBests.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Personal bests</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-left text-secondary border-b border-border"><th className="py-2 pr-4">Event</th><th className="py-2 pr-4">Time</th><th className="py-2 pr-4">Where</th><th className="py-2">Year</th></tr></thead>
                  <tbody>
                    {r.personalBests.map((p, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4">{p.event}{p.section ? <span className="text-secondary"> ({p.section.toLowerCase()})</span> : null}</td>
                        <td className="py-2 pr-4 font-semibold">{p.time}{p.mark && <span className="ml-2 text-xs font-bold text-[#f88c00]" title={{ WR: 'World record', WB: 'World best', AR: 'Area record', NR: 'National record', CR: 'Championship record', ER: 'European record', OR: 'Olympic record' }[p.mark] ?? p.mark}>{p.mark}</span>}</td>
                        <td className="py-2 pr-4">{p.place ?? ''}</td>
                        <td className="py-2">{p.year ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-secondary mt-2">From Wikipedia, checked monthly.</p>
            </section>
          )}

          {r.bestFinishes.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Best finishes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-left text-secondary border-b border-border"><th className="py-2 pr-4">Year</th><th className="py-2 pr-4">Race</th><th className="py-2 pr-4">Distance</th><th className="py-2 pr-4">Time</th><th className="py-2">Place</th></tr></thead>
                  <tbody>
                    {r.bestFinishes.map((b, i) => (
                      <tr key={i} className="border-b border-border/50"><td className="py-2 pr-4">{b.year}</td><td className="py-2 pr-4"><Link href={`/runners?race=${encodeURIComponent(b.race)}`} className="underline decoration-border underline-offset-2 hover:text-[#f88c00]" title={`Other runners who raced ${b.race}`}>{b.race}</Link></td><td className="py-2 pr-4">{b.distance ?? ''}</td><td className="py-2 pr-4">{b.time ?? ''}</td><td className="py-2">{b.position ?? ''}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {r.results.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-1">Race history</h2>
              <p className="text-secondary mb-4">{r.results.length} {r.results.length === 1 ? 'finish' : 'finishes'} on UTMB&apos;s results, {r.results[r.results.length - 1].year} to {r.results[0].year}. Refreshed every Monday.</p>
              <details className="group" open={r.results.length <= 12}>
                <summary className="cursor-pointer text-[#f88c00] font-semibold mb-3 group-open:mb-4">{r.results.length <= 12 ? 'Every result' : `Show all ${r.results.length} results`}</summary>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead><tr className="text-left text-secondary border-b border-border"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Race</th><th className="py-2 pr-4">Distance</th><th className="py-2 pr-4">Time</th><th className="py-2">Place</th></tr></thead>
                    <tbody>
                      {r.results.map((b, i) => (
                        <tr key={i} className="border-b border-border/50"><td className="py-2 pr-4 whitespace-nowrap">{b.date ? new Date(b.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : b.year}</td><td className="py-2 pr-4"><Link href={`/runners?race=${encodeURIComponent(b.race)}`} className="hover:text-[#f88c00]">{b.race}</Link></td><td className="py-2 pr-4">{b.distance ?? ''}</td><td className="py-2 pr-4">{b.time ?? ''}</td><td className="py-2">{b.position ?? ''}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          )}

          {raceFilms.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-1">See the course</h2>
              <p className="text-secondary mb-4">{r.name} raced {raceFilms.length === 1 ? 'this one' : 'these'}. So did we, with a camera.</p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {raceFilms.map(({ race, film }) => {
                  const id = youtubeId(film.url);
                  return (
                    <li key={race}>
                      <a href={film.url} target="_blank" rel="noopener" className="block group">
                        {id && (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                            <Image src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" fill sizes="(min-width: 1024px) 320px, 50vw" className="object-cover" />
                          </div>
                        )}
                        <span className="block mt-2 font-semibold text-foreground group-hover:text-[#f88c00]">{film.event} ({film.date.slice(0, 4)})</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
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

          {similar.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Similar runners</h2>
              <ul className="grid gap-3 grid-cols-3 sm:grid-cols-6">
                {similar.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/runners/${o.slug}`} className="block group">
                      {o.photo
                        ? (
                          <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                            <Image src={o.photo} alt="" fill sizes="(min-width: 640px) 16vw, 33vw" className="object-cover object-top" />
                          </div>
                        )
                        : <RunnerCard name={o.name} flag={flagEmoji(o.nationality)} index={null} className="aspect-[4/5] w-full rounded-xl" />}
                      <span className="block mt-1.5 text-sm font-semibold leading-snug text-foreground group-hover:text-[#f88c00]">{flagEmoji(o.nationality)} {o.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { href: '/tools/runner-quiz', title: 'What kind of runner are you?', body: 'Twelve runner types. Twelve questions, two minutes.' },
              { href: '/tools/calculators?calc=predictor', title: 'Predict your next race', body: 'Your time for any distance, from 2.4 million real results.' },
              { href: '/films', title: 'Watch the races', body: 'Film My Run race films, start line to finish.' },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="block rounded-xl border border-border p-5 hover:border-[#f88c00] group">
                <span className="block font-display text-lg font-bold text-foreground group-hover:text-[#f88c00]">{c.title}</span>
                <span className="block text-sm text-secondary mt-1">{c.body}</span>
              </Link>
            ))}
          </section>

          <section className="mt-12 rounded-2xl bg-zinc-900 p-6 lg:p-8">
            <NewsletterForm variant="stacked" theme="dark" heading={`Follow ${r.name} and the rest`} description="The week's running news, results and new runner profiles, once a week." />
          </section>

          <section className="mt-12 text-sm text-secondary">
            <p className="mb-2">Updated {longDate(r.updatedAt)}</p>
            <p>Sources: {r.sources.map((s, i) => (<span key={s.url}>{i ? ', ' : ''}<a href={s.url} rel="nofollow noopener" target="_blank" className="underline hover:text-[#f88c00]">{s.name}</a></span>))}</p>
            {r.photos.length > 0 && <p className="mt-2">Photographer? Ask us to remove or change a photo: news@filmmyrun.com</p>}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
