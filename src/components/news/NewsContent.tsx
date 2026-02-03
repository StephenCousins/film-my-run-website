'use client';

import { useState } from 'react';
import { Calendar, ExternalLink, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

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
// SOURCE BADGE COLORS
// ============================================

const sourceColors: Record<string, string> = {
  'iRunFar': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Trail Runner Magazine': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Freetrail': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Canadian Running': 'bg-red-500/20 text-red-400 border-red-500/30',
  'RunABC South': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'RunABC Scotland': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'LetsRun': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Athletics Weekly': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'BBC Sport': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

function getSourceColor(source: string): string {
  return sourceColors[source] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
}

const sourceAccentBorders: Record<string, string> = {
  'iRunFar': 'border-l-blue-500',
  'Trail Runner Magazine': 'border-l-green-500',
  'Freetrail': 'border-l-emerald-500',
  'Canadian Running': 'border-l-red-500',
  'RunABC South': 'border-l-sky-500',
  'RunABC Scotland': 'border-l-teal-500',
  'LetsRun': 'border-l-orange-500',
  'Athletics Weekly': 'border-l-indigo-500',
  'BBC Sport': 'border-l-rose-500',
};

function getSourceAccentBorder(source: string): string {
  return sourceAccentBorders[source] || 'border-l-zinc-500';
}

// ============================================
// ARTICLE CARD COMPONENT
// ============================================

function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const pubDate = new Date(article.pubDate);
  const isRecent = Date.now() - pubDate.getTime() < 24 * 60 * 60 * 1000;
  const hasImage = !!article.imageUrl;

  if (!hasImage) {
    return (
      <article
        className={cn(
          'group relative bg-surface rounded-2xl overflow-hidden border border-border/50 transition-all duration-300 hover:-translate-y-1',
          'shadow-sm hover:shadow-lg hover:shadow-brand/5 hover:border-brand/30',
          'border-l-4',
          getSourceAccentBorder(article.source),
          featured && 'lg:col-span-2'
        )}
      >
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full"
        >
          <div className="p-5 lg:p-6 flex flex-col flex-1 h-full">
            {isRecent && (
              <div className="mb-3">
                <span className="px-2.5 py-1 bg-brand text-white text-xs font-bold rounded-md uppercase tracking-wide shadow-lg">
                  New
                </span>
              </div>
            )}

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

            <h2 className={cn(
              'font-display font-semibold text-foreground group-hover:text-brand transition-colors duration-200 mb-3 leading-snug',
              featured ? 'text-xl lg:text-2xl' : 'text-base lg:text-lg'
            )}>
              {article.title}
            </h2>

            {article.description && (
              <p className={cn(
                'text-secondary leading-relaxed mb-4 flex-1',
                featured ? 'text-sm lg:text-base line-clamp-5' : 'text-sm line-clamp-3'
              )}>
                {article.description}
              </p>
            )}

            <div className="flex items-center gap-1.5 text-brand font-medium text-sm group-hover:gap-2.5 transition-all duration-200 mt-auto pt-2">
              Read Article
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </div>
        </a>
      </article>
    );
  }

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
          featured ? 'flex flex-col lg:flex-row' : ''
        )}
      >
        <div className={cn(
          'relative overflow-hidden bg-zinc-800',
          featured
            ? 'h-52 lg:h-auto lg:w-2/5 lg:min-h-[300px]'
            : 'h-44'
        )}>
          <img
            src={article.imageUrl!}
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

        <div className={cn(
          'p-5 lg:p-6 flex flex-col',
          featured ? 'lg:w-3/5 lg:py-8' : '',
          'flex-1'
        )}>
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

          <h2 className={cn(
            'font-display font-semibold text-foreground group-hover:text-brand transition-colors duration-200 mb-3 leading-snug',
            featured ? 'text-xl lg:text-2xl' : 'text-base lg:text-lg'
          )}>
            {article.title}
          </h2>

          {article.description && (
            <p className={cn(
              'text-secondary leading-relaxed mb-4 flex-1',
              featured ? 'text-sm lg:text-base line-clamp-4' : 'text-sm line-clamp-2'
            )}>
              {article.description}
            </p>
          )}

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

function SourceFilter({
  sources,
  counts,
  totalCount,
  selectedSource,
  onSelectSource,
}: {
  sources: string[];
  counts: Record<string, number>;
  totalCount: number;
  selectedSource: string | null;
  onSelectSource: (source: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-w-max">
      <button
        onClick={() => onSelectSource(null)}
        className={cn(
          'px-4 py-1.5 text-sm font-medium rounded-full shadow-sm transition-all duration-200',
          selectedSource === null
            ? 'bg-brand text-white'
            : 'bg-brand/15 text-brand cursor-pointer hover:bg-brand/25'
        )}
      >
        All
        <span className="ml-1.5 opacity-80">({totalCount})</span>
      </button>
      <span className="w-px h-5 bg-border/50 mx-1" />
      {sources.map((source) => (
        <button
          key={source}
          onClick={() => onSelectSource(selectedSource === source ? null : source)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-full border whitespace-nowrap transition-all duration-200',
            getSourceColor(source),
            selectedSource === source
              ? 'ring-2 ring-offset-1 ring-offset-background ring-current'
              : 'cursor-pointer hover:opacity-80'
          )}
        >
          {source}
          <span className="ml-1 opacity-60">({counts[source] || 0})</span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// NEWS CONTENT (exported client component)
// ============================================

export default function NewsContent({ articles }: { articles: Article[] }) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Compute source counts from all articles (not filtered)
  const sourceCounts: Record<string, number> = {};
  articles.forEach((article) => {
    sourceCounts[article.source] = (sourceCounts[article.source] || 0) + 1;
  });
  const sources = Object.keys(sourceCounts).sort();
  const totalCount = articles.length;

  // Filter articles
  const filteredArticles = selectedSource
    ? articles.filter((a) => a.source === selectedSource)
    : articles;

  return (
    <>
      {/* Source filters */}
      <section className="py-4 border-b border-border/50 bg-background/90 backdrop-blur-md sticky top-16 lg:top-20 z-30">
        <div className="container">
          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
            <SourceFilter
              sources={sources}
              counts={sourceCounts}
              totalCount={totalCount}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
            />
          </div>
        </div>
      </section>

      {/* Articles grid */}
      <section className="py-10 lg:py-16 bg-background">
        <div className="container">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-20">
              <Newspaper className="w-16 h-16 mx-auto text-muted mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No articles yet</h2>
              <p className="text-secondary">Check back soon for the latest trail running news.</p>
            </div>
          ) : (
            <>
              {/* Featured articles - top row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {filteredArticles.slice(0, 2).map((article) => (
                  <ArticleCard key={article.id} article={article} featured />
                ))}
              </div>

              {/* Regular articles grid */}
              {filteredArticles.length > 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArticles.slice(2).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
