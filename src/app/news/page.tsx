import { Metadata } from 'next';
import Link from 'next/link';
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
  'iRunFar': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'UltraRunning Magazine': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Trail Runner Magazine': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Canadian Running': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Mud and Routes': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Trail Running Magazine': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
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
        'group bg-surface rounded-2xl overflow-hidden border border-border hover:border-brand/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        featured && 'lg:col-span-2'
      )}
    >
      <a 
        href={article.link} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block h-full p-5 lg:p-6"
      >
        {/* Header with source and date */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className={cn(
            'px-3 py-1 text-xs font-medium rounded-full border',
            getSourceColor(article.source)
          )}>
            {article.source}
          </span>
          <div className="flex items-center gap-2">
            {isRecent && (
              <span className="px-2 py-0.5 bg-brand/20 text-brand text-xs font-medium rounded-full">
                New
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted">
              <Calendar className="w-3 h-3" />
              {pubDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className={cn(
          'font-display font-semibold text-foreground group-hover:text-brand transition-colors mb-3',
          featured ? 'text-xl lg:text-2xl' : 'text-lg'
        )}>
          {article.title}
        </h2>

        {/* Description */}
        {article.description && (
          <p className={cn(
            'text-secondary line-clamp-3 mb-4',
            featured ? 'text-base' : 'text-sm'
          )}>
            {article.description}
          </p>
        )}

        {/* Read more */}
        <div className="flex items-center gap-1 text-brand font-medium text-sm group-hover:gap-2 transition-all">
          Read Article
          <ExternalLink className="w-3.5 h-3.5" />
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
    <div className="flex flex-wrap gap-2">
      <span className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-full">
        All Sources
        <span className="ml-1 opacity-70">({Object.values(counts).reduce((a, b) => a + b, 0)})</span>
      </span>
      {sources.map((source) => (
        <span
          key={source}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-full border cursor-default',
            getSourceColor(source)
          )}
        >
          {source}
          <span className="ml-1 opacity-70">({counts[source] || 0})</span>
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
        <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(248,140,0,0.1),_transparent_70%)]" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <Newspaper className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Daily Updates</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Trail & Ultra Running News
              </h1>
              <p className="text-lg text-zinc-300 max-w-2xl">
                The latest stories from the world of trail and ultra running. 
                Curated from trusted sources and updated daily.
              </p>

              {/* Last updated */}
              <div className="flex items-center gap-2 mt-6 text-sm text-zinc-500">
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
        <section className="py-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-16 lg:top-20 z-30">
          <div className="container">
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
              <SourceFilter sources={sources} counts={sourceCounts} />
            </div>
          </div>
        </section>

        {/* Articles grid */}
        <section className="py-12 lg:py-16 bg-background">
          <div className="container">
            {articles.length === 0 ? (
              <div className="text-center py-16">
                <Newspaper className="w-16 h-16 mx-auto text-muted mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No articles yet</h2>
                <p className="text-secondary">Check back soon for the latest trail running news.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Featured articles (first 2) */}
                {articles.slice(0, 2).map((article) => (
                  <ArticleCard key={article.id} article={article} featured />
                ))}

                {/* Regular articles */}
                {articles.slice(2).map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 lg:py-24 bg-surface-secondary">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Weekly News Digest
              </h2>
              <p className="text-secondary mb-8">
                Get the best trail and ultra running stories delivered to your inbox 
                every week. No spam, just the news that matters.
              </p>
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 bg-surface border border-border rounded-full text-foreground placeholder:text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-brand text-white font-semibold rounded-full hover:bg-brand-hover transition-colors whitespace-nowrap"
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
