import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ArrowLeft, ExternalLink, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import { prisma } from '@/lib/db';
import { sanitizeContent } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

// ============================================
// DATA FETCHING
// ============================================

async function getStoryBySlug(slug: string) {
  const story = await prisma.news_stories.findUnique({
    where: { slug },
  });

  if (!story || story.status !== 'published') return null;

  return {
    id: story.id,
    title: story.title,
    slug: story.slug,
    excerpt: story.excerpt,
    content: story.content,
    imageUrl: story.image_url,
    sourceUrl: story.source_url,
    roundupDate: story.roundup_date.toISOString(),
    publishedAt: story.published_at?.toISOString() || story.created_at.toISOString(),
  };
}

async function getRelatedStories(currentSlug: string) {
  const stories = await prisma.news_stories.findMany({
    where: {
      slug: { not: currentSlug },
      status: 'published',
    },
    orderBy: [{ priority: 'asc' }, { published_at: 'desc' }],
    take: 3,
  });

  return stories.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    imageUrl: s.image_url,
    publishedAt: s.published_at?.toISOString() || s.created_at.toISOString(),
  }));
}

// ============================================
// METADATA
// ============================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);

  if (!story) {
    return { title: 'Story Not Found | Film My Run' };
  }

  return {
    title: `${story.title} | Film My Run`,
    description: story.excerpt,
    alternates: {
      canonical: `https://filmmyrun.co.uk/news/${slug}`,
    },
    openGraph: {
      title: story.title,
      description: story.excerpt,
      type: 'article',
      publishedTime: story.publishedAt,
      images: story.imageUrl ? [story.imageUrl] : [],
    },
  };
}

// ============================================
// NEWS STORY PAGE
// ============================================

export default async function NewsStoryPage({ params }: PageProps) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  const relatedStories = await getRelatedStories(slug);
  const storyUrl = `https://filmmyrun.co.uk/news/${story.slug}`;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: story.excerpt,
    image: story.imageUrl || undefined,
    datePublished: story.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Film My Run',
      url: 'https://filmmyrun.co.uk',
    },
    publisher: {
      '@id': 'https://filmmyrun.co.uk/#organization',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': storyUrl,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://filmmyrun.co.uk' },
      { '@type': 'ListItem', position: 2, name: 'News', item: 'https://filmmyrun.co.uk/news' },
      { '@type': 'ListItem', position: 3, name: story.title, item: storyUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="relative">
          <div className="relative h-[40vh] lg:h-[50vh] bg-surface">
            {story.imageUrl ? (
              <Image
                src={story.imageUrl}
                alt={story.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-9xl opacity-20">📰</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--color-background))] via-black/50 to-black/70" />
          </div>

          {/* Title overlay */}
          <div className="container relative -mt-32 lg:-mt-40 z-10">
            <div className="max-w-3xl">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-muted mb-4">
                <Link href="/news" className="hover:text-brand transition-colors">
                  News
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-muted truncate">{story.title}</span>
              </nav>

              {/* FMR Original badge */}
              <span className="inline-block px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-full mb-4">
                FMR Original
              </span>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                {story.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(story.publishedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-muted">|</span>
                <span>
                  Source:{' '}
                  <a
                    href={story.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    iRunFar
                  </a>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 lg:py-16 bg-background">
          <div className="container">
            <div className="grid lg:grid-cols-12 gap-12">
              {/* Main content */}
              <article className="lg:col-span-8">
                <div
                  className="prose prose-lg dark:prose-invert prose-orange max-w-none
                    prose-headings:font-display prose-headings:font-bold
                    prose-p:text-secondary prose-p:leading-relaxed
                    prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizeContent(story.content) }}
                />

                {/* Source attribution */}
                <div className="mt-10 pt-8 border-t border-border">
                  <a
                    href={story.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-surface hover:bg-surface-secondary border border-border rounded-xl text-sm text-secondary hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Read the full iRunFar roundup
                  </a>
                </div>
              </article>

              {/* Sidebar */}
              <aside className="lg:col-span-4">
                <div className="lg:sticky lg:top-28 space-y-8">
                  {/* Back to news */}
                  <Link
                    href="/news"
                    className="inline-flex items-center gap-2 text-muted hover:text-brand transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to News
                  </Link>

                  {/* Related stories */}
                  {relatedStories.length > 0 && (
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                        More Stories
                      </h3>
                      <div className="space-y-4">
                        {relatedStories.map((related) => (
                          <Link
                            key={related.id}
                            href={`/news/${related.slug}`}
                            className="group flex gap-4"
                          >
                            <div className="w-20 h-20 rounded-lg bg-surface-tertiary overflow-hidden flex-shrink-0">
                              {related.imageUrl && (
                                <Image
                                  src={related.imageUrl}
                                  alt={related.title}
                                  width={80}
                                  height={80}
                                  className="object-cover w-full h-full"
                                />
                              )}
                            </div>
                            <div>
                              <span className="text-xs text-orange-500 font-medium">
                                FMR Original
                              </span>
                              <h4 className="font-medium text-foreground group-hover:text-brand transition-colors line-clamp-2 text-sm mt-1">
                                {related.title}
                              </h4>
                              <span className="text-xs text-muted mt-1 block">
                                {new Date(related.publishedAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Newsletter */}
                  <div className="p-6 bg-surface rounded-2xl">
                    <NewsletterForm
                      variant="stacked"
                      theme="dark"
                      heading="Stay Updated"
                      description="Get trail running news delivered weekly."
                    />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
