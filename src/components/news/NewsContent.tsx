'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  isOriginal?: boolean;
  tags?: string[];
  importance?: number;
  /** The biggest story of the last three days (orderForPage): leads the page with a badge. */
  topStory?: boolean;
}

const TAG_ORDER = ['Trail & Ultra', 'Road', 'Track', 'UK'];

/**
 * Laid out like a newspaper front page (BBC News style, 1 Oct 2026): a lead story with a
 * big picture, six smaller picture stories beside it, a row of headlines with no picture,
 * then the rest. Flat, no cards or shadows: the headlines do the work.
 */
const PER_PAGE = 20;

// ============================================
// PIECES
// ============================================

function StoryLink({ article, children, className }: { article: Article; children: React.ReactNode; className?: string }) {
  if (article.isOriginal) {
    return <Link href={article.link} className={className}>{children}</Link>;
  }
  return <a href={article.link} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}

/** "37min", "5h", "2d", then the date: how long ago, as a news page says it. */
function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}min`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h`;
  if (mins < 7 * 24 * 60) return `${Math.round(mins / (24 * 60))}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** The section and how long ago, under every headline. */
function Meta({ article, chips }: { article: Article; chips: (a: Article) => string[] }) {
  const section = chips(article)[0] ?? article.source;
  return (
    <p className="mt-auto pt-3 text-sm">
      <span className="text-brand">{section}</span>
      <span className="text-muted"> · {ago(article.pubDate)}</span>
    </p>
  );
}

function Picture({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-zinc-200 dark:bg-zinc-800', className)}>
      {src && <img src={src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
    </div>
  );
}

function TopStory() {
  return <span className="text-brand font-bold uppercase tracking-wide mr-2">Top story</span>;
}

/** The lead: the biggest picture, the biggest headline, the standfirst. */
function Lead({ article, chips }: { article: Article; chips: (a: Article) => string[] }) {
  return (
    <StoryLink article={article} className="group flex flex-col h-full">
      <Picture src={article.imageUrl} className="aspect-[16/9]" />
      <h2 className="mt-4 font-display text-2xl lg:text-[2rem] font-bold leading-tight text-foreground group-hover:underline">
        {article.topStory && <TopStory />}
        {article.title}
      </h2>
      {article.description && <p className="mt-3 text-secondary leading-relaxed line-clamp-3">{article.description}</p>}
      <Meta article={article} chips={chips} />
    </StoryLink>
  );
}

/** A picture story: picture above on wider screens, a thumbnail beside it on a phone. */
function PictureStory({ article, chips }: { article: Article; chips: (a: Article) => string[] }) {
  return (
    <StoryLink article={article} className="group flex sm:flex-col gap-4 sm:gap-0 h-full">
      <Picture src={article.imageUrl} className="w-32 shrink-0 aspect-[4/3] sm:w-full sm:aspect-[16/9]" />
      <div className="flex flex-col flex-1 sm:mt-3">
        <h3 className="font-display text-lg font-semibold leading-snug text-foreground group-hover:underline">
          {article.topStory && <TopStory />}
          {article.title}
        </h3>
        <Meta article={article} chips={chips} />
      </div>
    </StoryLink>
  );
}

/** A headline with no picture, under a rule. */
function Headline({ article, chips }: { article: Article; chips: (a: Article) => string[] }) {
  return (
    <StoryLink article={article} className="group flex flex-col h-full border-t border-border pt-3">
      <h3 className="font-display text-lg font-semibold leading-snug text-foreground group-hover:underline">{article.title}</h3>
      <Meta article={article} chips={chips} />
    </StoryLink>
  );
}

// ============================================
// NEWS CONTENT (exported client component)
// ============================================

export default function NewsContent({
  articles,
  topicChips = false,
}: {
  articles: Article[];
  /** true from go-live (Task 12): the section bar runs on topic tags, fixed order, instead of on `article.source`. */
  topicChips?: boolean;
}) {
  const [section, setSection] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const chips = (article: Article): string[] => (topicChips ? article.tags ?? [] : [article.source]);
  const counts: Record<string, number> = {};
  for (const a of articles) for (const tag of chips(a)) counts[tag] = (counts[tag] || 0) + 1;
  const sections = topicChips ? TAG_ORDER.filter((tag) => counts[tag]) : Object.keys(counts).sort();

  const filtered = section ? articles.filter((a) => chips(a).includes(section)) : articles;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  // The front page shape only on page one: lead, six picture stories, five headlines, the rest.
  const front = page === 0;
  const lead = front ? shown[0] : undefined;
  const pictures = front ? shown.slice(1, 7) : [];
  const headlines = front ? shown.slice(7, 12) : [];
  const rest = front ? shown.slice(12) : shown;

  const choose = (s: string | null) => { setSection(s); setPage(0); };
  const goTo = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <>
      {/* The section bar: text links between rules, as a newspaper site has them. */}
      <nav aria-label="News sections" className="border-y border-border bg-background sticky top-16 lg:top-20 z-30">
        <div className="container overflow-x-auto scrollbar-hide">
          <ul className="flex items-stretch min-w-max text-[15px]">
            {[null, ...sections].map((s, i) => (
              <li key={s ?? 'all'} className={cn('flex items-center', i > 0 && 'before:content-[""] before:h-4 before:w-px before:bg-border')}>
                <button
                  onClick={() => choose(s)}
                  aria-pressed={section === s}
                  className={cn(
                    'px-3 py-3 first:pl-0 border-b-[3px] -mb-px transition-colors',
                    section === s ? 'border-brand text-foreground font-semibold' : 'border-transparent text-secondary hover:text-foreground'
                  )}
                >
                  {s ?? 'Latest'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <section className="py-8 lg:py-10 bg-background">
        <div className="container">
          {filtered.length === 0 ? (
            <p className="py-20 text-center text-secondary">No stories yet. Check back tomorrow morning.</p>
          ) : (
            <>
              {lead && (
                <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="sm:col-span-2 lg:row-span-2"><Lead article={lead} chips={chips} /></div>
                  {pictures.map((a) => <PictureStory key={a.id} article={a} chips={chips} />)}
                </div>
              )}

              {headlines.length > 0 && (
                <div className="mt-10 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
                  {headlines.map((a) => <Headline key={a.id} article={a} chips={chips} />)}
                </div>
              )}

              {rest.length > 0 && (
                <>
                  {front && <h2 className="mt-14 mb-6 font-display text-2xl font-bold text-foreground">More stories</h2>}
                  <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                    {rest.map((a) => <PictureStory key={a.id} article={a} chips={chips} />)}
                  </div>
                </>
              )}

              {pageCount > 1 && (
                <nav aria-label="News pages" className="mt-12 flex items-center justify-center gap-4">
                  <button
                    onClick={() => goTo(page - 1)}
                    disabled={page === 0}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:border-brand disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Newer
                  </button>
                  <span className="text-sm text-secondary tabular-nums">Page {page + 1} of {pageCount}</span>
                  <button
                    onClick={() => goTo(page + 1)}
                    disabled={page === pageCount - 1}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:border-brand disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Older
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
