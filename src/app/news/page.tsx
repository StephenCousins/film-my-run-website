import { Metadata } from 'next';

import { RefreshCw, Newspaper } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsContent from '@/components/news/NewsContent';
import NewsletterForm from '@/components/newsletter/NewsletterForm';

export const dynamic = 'force-dynamic';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Trail & Ultra Running News',
  alternates: { canonical: 'https://filmmyrun.co.uk/news' },
  description: 'The latest news from the world of trail and ultra running. Curated stories from trusted sources, updated daily.',
  keywords: [
    'trail running news',
    'ultra running news',
    'running news',
    'UTMB news',
    'trail race results',
  ],
  openGraph: {
    title: 'Trail & Ultra Running News | Film My Run',
    description: 'The latest news from the world of trail and ultra running.',
  },
};

// ============================================
// TYPES
// ============================================

interface Article {
  id: string;
  title: string;
  link: string;
  description: string;
  imageUrl: string | null;
  pubDate: string;
  source: string;
  category: string;
  isOriginal?: boolean;
}

// ============================================
// DATA FETCHING
// ============================================

import { getArticles as fetchArticles } from '@/lib/rss-fetcher';
import { prisma } from '@/lib/db';

async function getOriginalStories(): Promise<Article[]> {
  try {
    const stories = await prisma.news_stories.findMany({
      where: { status: 'published' },
      orderBy: [{ priority: 'asc' }, { published_at: 'desc' }],
    });

    return stories.map((story) => ({
      id: `fmr-${story.id}`,
      title: story.title,
      link: `/news/${story.slug}`,
      description: story.excerpt,
      imageUrl: story.image_url,
      pubDate: story.published_at?.toISOString() || story.created_at.toISOString(),
      source: 'Film My Run',
      category: 'trail',
      isOriginal: true,
    }));
  } catch (error) {
    console.error('Error fetching original stories:', error);
    return [];
  }
}

async function getArticles(): Promise<Article[]> {
  try {
    const [rssArticles, originalStories] = await Promise.all([
      fetchArticles(14, 100).then((articles) =>
        articles.map((article) => ({
          id: article.id.toString(),
          title: article.title,
          link: article.link,
          description: article.description || '',
          imageUrl: article.image_url,
          pubDate: article.pub_date.toISOString(),
          source: article.source,
          category: article.category || 'trail',
        }))
      ),
      getOriginalStories(),
    ]);

    // Merge: original stories first, then RSS articles by date
    const merged = [...originalStories, ...rssArticles];
    return merged;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

// ============================================
// NEWS PAGE
// ============================================

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://filmmyrun.co.uk' },
    { '@type': 'ListItem', position: 2, name: 'News', item: 'https://filmmyrun.co.uk/news' },
  ],
};

export default async function NewsPage() {
  const articles = await getArticles();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />

      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero section */}
        <section className="relative py-24 lg:py-36 overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="/images/news/hero.jpg"
              alt="Trail runner on mountain path at Transvulcania"
              className="w-full h-full object-cover object-[center_35%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
          </div>

          <div className="container relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
                <Newspaper className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300 text-sm font-medium">Daily Updates</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                Trail & Ultra Running News
              </h1>
              <p className="text-lg lg:text-xl text-white/80 max-w-2xl leading-relaxed">
                The latest stories from the world of trail and ultra running.
                Curated from trusted sources and updated daily.
              </p>

              {/* Last updated */}
              <div className="flex items-center gap-2 mt-8 text-sm text-white/50">
                <RefreshCw className="w-4 h-4" />
                <span>
                  Last updated: {new Date().toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </section>

        <NewsContent articles={articles} />

        {/* Newsletter CTA */}
        <section className="relative py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-surface via-surface to-surface-secondary" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(248,140,0,0.08),_transparent_60%)]" />
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center">
              <span className="inline-block px-3 py-1 bg-brand/15 text-brand text-xs font-semibold rounded-full uppercase tracking-wider mb-4">
                Stay in the loop
              </span>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Weekly News Digest
              </h2>
              <p className="text-muted mb-8 leading-relaxed">
                Get the best trail and ultra running stories delivered to your inbox
                every week. No spam, just the news that matters.
              </p>
              <NewsletterForm
                variant="inline"
                theme="light"
                className="max-w-md mx-auto"
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
