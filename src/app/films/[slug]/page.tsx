import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, Award, ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/db';

export const revalidate = 300;

// ============================================
// TYPES
// ============================================

interface FilmRow {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  youtube_id: string | null;
  vimeo_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  year: number | null;
  awards: string[];
  featured: boolean;
  created_at: Date;
  meta: Record<string, string> | null;
}

interface FilmPageProps {
  params: Promise<{ slug: string }>;
}

async function getFilm(slug: string): Promise<FilmRow | null> {
  const rows = await prisma.$queryRaw<FilmRow[]>`
    SELECT * FROM films WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] || null;
}

// ============================================
// METADATA
// ============================================

export async function generateMetadata({ params }: FilmPageProps): Promise<Metadata> {
  const { slug } = await params;
  const film = await getFilm(slug);

  if (!film) return { title: 'Film Not Found' };

  return {
    title: film.title,
    description: film.description?.slice(0, 160) || `${film.title} — a Film My Run documentary.`,
    alternates: { canonical: `https://filmmyrun.co.uk/films/${slug}` },
    openGraph: {
      title: `${film.title} | Film My Run`,
      description: film.description?.slice(0, 160) || undefined,
      images: film.thumbnail_url ? [film.thumbnail_url] : [],
      type: 'video.movie',
    },
  };
}

// ============================================
// PAGE
// ============================================

export default async function FilmPage({ params }: FilmPageProps) {
  const { slug } = await params;
  const film = await getFilm(slug);

  if (!film) notFound();

  const durationMinutes = film.duration_seconds
    ? Math.round(film.duration_seconds / 60)
    : null;

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: film.title,
    description: film.description,
    thumbnailUrl: film.thumbnail_url,
    uploadDate: film.created_at.toISOString(),
    duration: film.duration_seconds ? `PT${Math.floor(film.duration_seconds / 60)}M${film.duration_seconds % 60}S` : undefined,
    contentUrl: film.youtube_id ? `https://www.youtube.com/watch?v=${film.youtube_id}` : undefined,
    embedUrl: film.youtube_id ? `https://www.youtube.com/embed/${film.youtube_id}` : undefined,
    creator: {
      '@type': 'Person',
      name: 'Stephen Cousins',
      url: 'https://filmmyrun.co.uk/about',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://filmmyrun.co.uk' },
      { '@type': 'ListItem', position: 2, name: 'Films', item: 'https://filmmyrun.co.uk/films' },
      { '@type': 'ListItem', position: 3, name: film.title, item: `https://filmmyrun.co.uk/films/${slug}` },
    ],
  };

  // Parse the meta JSON field for extra content
  const meta = film.meta || {};
  const synopsis = meta.synopsis || film.description || '';
  const behindTheScenesId = meta.behind_the_scenes_youtube_id || null;
  const filmmakerBio = meta.filmmaker_bio || '';
  const credits = meta.credits || '';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />

      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero — Full-width video embed */}
        <section className="bg-black">
          <div className="container max-w-6xl py-8">
            {/* Back link */}
            <Link
              href="/films"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              All Films
            </Link>

            {/* Video */}
            {film.youtube_id && (
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${film.youtube_id}?rel=0`}
                  title={film.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        </section>

        {/* Film info */}
        <section className="py-12 lg:py-16">
          <div className="container max-w-4xl">
            {/* Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {film.title}
            </h1>

            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-secondary mb-8">
              {film.year && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand" />
                  {film.year}
                </span>
              )}
              {durationMinutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand" />
                  {durationMinutes} minutes
                </span>
              )}
              {film.awards && film.awards.length > 0 && film.awards.map((award, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-brand" />
                  {award}
                </span>
              ))}
            </div>

            {/* Synopsis */}
            {synopsis && (
              <div className="mb-12">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">Synopsis</h2>
                <div className="text-secondary leading-relaxed space-y-4 text-lg">
                  {synopsis.split('\n\n').map((paragraph: string, i: number) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Film stills */}
            {film.thumbnail_url && (
              <div className="mb-12">
                <div className="rounded-xl overflow-hidden">
                  <Image
                    src={film.thumbnail_url}
                    alt={`Still from ${film.title}`}
                    width={1200}
                    height={675}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* Behind the Scenes */}
            {behindTheScenesId && (
              <div className="mb-12">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">Behind the Scenes</h2>
                <div className="aspect-video rounded-xl overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${behindTheScenesId}?rel=0`}
                    title={`Behind the Scenes — ${film.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Filmmaker */}
            {filmmakerBio && (
              <div className="mb-12 p-6 lg:p-8 rounded-2xl bg-surface-secondary border border-border">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">The Filmmaker</h2>
                <div className="text-secondary leading-relaxed space-y-4">
                  {filmmakerBio.split('\n\n').map((paragraph: string, i: number) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Credits */}
            {credits && (
              <div className="mb-12">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">Credits</h2>
                <div className="text-secondary leading-relaxed whitespace-pre-line">
                  {credits}
                </div>
              </div>
            )}

            {/* Related blog post link */}
            <div className="pt-8 border-t border-border">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Related</h2>
              <Link
                href="/blog/filming-the-fastest-100-miles-on-british-soil-south-downs-way-100-2025"
                className="group flex items-center gap-4 p-4 rounded-xl bg-surface-secondary border border-border hover:border-brand transition-colors"
              >
                <div>
                  <p className="font-semibold text-foreground group-hover:text-brand transition-colors">
                    Read the Blog Post
                  </p>
                  <p className="text-sm text-secondary">
                    The full story of filming Mark Derbyshire&apos;s record-breaking run
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
