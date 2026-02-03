import { Metadata } from 'next';

import { Calendar, ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Trail & Ultra Running News',
  description: 'The latest news from the world of trail and ultra running. Curated stories from trusted sources, updated daily.',
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
}

// ============================================
// DATA FETCHING
// ============================================

import { getArticles as fetchArticles } from '@/lib/rss-fetcher';

async function getArticles(): Promise<Article[]> {
  try {
    const articles = await fetchArticles(14, 50);

    return articles.map((article) => ({
      id: article.id.toString(),
      title: article.title,
      link: article.link,
      description: article.description || '',
      imageUrl: article.image_url,
      pubDate: article.pub_date.toISOString(),
      source: article.source,
      category: article.category || 'trail',
    }));
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

// ============================================
// SOURCE BADGE COLORS
// ============================================

const sourceColors: Record<string, string> = {
  // Trail & Ultra (priority 1)
  'iRunFar': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'UltraRunning Magazine': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Trail Runner Magazine': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Freetrail': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Trail Sisters': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  // General Running (priority 2)
  'Canadian Running': 'bg-red-500/20 text-red-400 border-red-500/30',
  'RunABC South': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'RunABC Scotland': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  // Athletics (priority 4)
  'LetsRun': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Athletics Weekly': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

function getSourceColor(source: string): string {
  return sourceColors[source] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
}

// ============================================
// ARTICLE CARD COMPONENT
// ============================================

function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const pubDate = new Date(article.pubDate);
  const isRecent = Date.now() - pubDate.getTime() < 24 * 60 * 60 * 1000; // Less than 24h old

  return (
    <article
      className={cn(
        'group relative bg-surface rounded-2xl overflow-hidden border border-border/50 transition-all duration-300 hover:-translate-y-1',
        'shadow-sm hover:shadow-lg hover:shadow-brand/5 hover:border-brand/30',
        featured && 'lg:col-span-2'
      )}
    >
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'block h-full',
          article.imageUrl && featured ? 'flex flex-col lg:flex-row' : ''
        )}
      >
        {/* Thumbnail */}
        {article.imageUrl ? (
          <div className={cn(
            'relative overflow-hidden bg-zinc-800',
            featured
              ? 'h-52 lg:h-auto lg:w-2/5 lg:min-h-[300px]'
              : 'h-44'
          )}>
            <img
              src={article.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {isRecent && (
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 bg-brand text-white text-xs font-bold rounded-md uppercase tracking-wide shadow-lg">
                  New
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            'relative overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center',
            featured ? 'h-52 lg:h-auto lg:w-2/5 lg:min-h-[300px]' : 'h-32'
          )}>
            <Newspaper className="w-10 h-10 text-zinc-600" />
            {isRecent && (
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 bg-brand text-white text-xs font-bold rounded-md uppercase tracking-wide shadow-lg">
                  New
                </span>
              </div>
            )}
          </div>
        )}

        <div className={cn(
          'p-5 lg:p-6 flex flex-col',
          article.imageUrl && featured ? 'lg:w-3/5 lg:py-8' : '',
          'flex-1'
        )}>
          {/* Source and date row */}
          <div className="flex items-center gap-3 mb-3">
            <span className={cn(
              'px-3 py-1 text-xs font-medium rounded-full border',
              getSourceColor(article.source)
            )}>
              {article.source}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Calendar className="w-3 h-3" />
              {pubDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Title */}
          <h2 className={cn(
            'font-display font-semibold text-foreground group-hover:text-brand transition-colors duration-200 mb-3 leading-snug',
            featured ? 'text-xl lg:text-2xl' : 'text-base lg:text-lg'
          )}>
            {article.title}
          </h2>

          {/* Description */}
          {article.description && (
            <p className={cn(
              'text-secondary leading-relaxed mb-4 flex-1',
              featured ? 'text-sm lg:text-base line-clamp-4' : 'text-sm line-clamp-2'
            )}>
              {article.description}
            </p>
          )}

          {/* Read more */}
          <div className="flex items-center gap-1.5 text-brand font-medium text-sm group-hover:gap-2.5 transition-all duration-200 mt-auto pt-2">
            Read Article
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>
      </a>
    </article>
  );
}

// ============================================
// SOURCE FILTER
// ============================================

function SourceFilter({ sources, counts }: { sources: string[]; counts: Record<string, number> }) {
  return (
    <div className="flex items-center gap-2 min-w-max">
      <span className="px-4 py-1.5 bg-brand text-white text-sm font-medium rounded-full shadow-sm">
        All
        <span className="ml-1.5 opacity-80">({Object.values(counts).reduce((a, b) => a + b, 0)})</span>
      </span>
      <span className="w-px h-5 bg-border/50 mx-1" />
      {sources.map((source) => (
        <span
          key={source}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-full border cursor-default whitespace-nowrap',
            getSourceColor(source)
          )}
        >
          {source}
          <span className="ml-1 opacity-60">({counts[source] || 0})</span>
        </span>
      ))}
    </div>
  );
}

// ============================================
// NEWS PAGE
// ============================================

export default async function NewsPage() {
  const articles = await getArticles();
  
  // Count articles by source
  const sourceCounts: Record<string, number> = {};
  articles.forEach((article) => {
    sourceCounts[article.source] = (sourceCounts[article.source] || 0) + 1;
  });
  const sources = Object.keys(sourceCounts).sort();

  return (
    <>
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

        {/* Source filters */}
        <section className="py-4 border-b border-border/50 bg-background/90 backdrop-blur-md sticky top-16 lg:top-20 z-30">
          <div className="container">
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
              <SourceFilter sources={sources} counts={sourceCounts} />
            </div>
          </div>
        </section>

        {/* Articles grid */}
        <section className="py-10 lg:py-16 bg-background">
          <div className="container">
            {articles.length === 0 ? (
              <div className="text-center py-20">
                <Newspaper className="w-16 h-16 mx-auto text-muted mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No articles yet</h2>
                <p className="text-secondary">Check back soon for the latest trail running news.</p>
              </div>
            ) : (
              <>
                {/* Featured articles - top row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {articles.slice(0, 2).map((article) => (
                    <ArticleCard key={article.id} article={article} featured />
                  ))}
                </div>

                {/* Regular articles grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.slice(2).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="relative py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(248,140,0,0.08),_transparent_60%)]" />
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center">
              <span className="inline-block px-3 py-1 bg-brand/15 text-brand text-xs font-semibold rounded-full uppercase tracking-wider mb-4">
                Stay in the loop
              </span>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
                Weekly News Digest
              </h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Get the best trail and ultra running stories delivered to your inbox
                every week. No spam, just the news that matters.
              </p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-5 py-3 bg-white/10 border border-white/15 rounded-full text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand backdrop-blur-sm"
                />
                <button
                  type="submit"
                  className="px-7 py-3 bg-brand text-white font-semibold rounded-full hover:bg-brand-hover transition-colors whitespace-nowrap shadow-lg shadow-brand/20"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
