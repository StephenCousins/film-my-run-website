'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Clock, ArrowRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string | null;
  published_at: string;
  readTime: number;
  category: {
    name: string;
    slug: string;
  };
}

interface Category {
  name: string;
  slug: string;
  count: number;
}

const POSTS_PER_PAGE = 12;

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return (
    <article
      className={cn(
        'group bg-surface rounded-2xl overflow-hidden border border-border hover:border-brand/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        featured && 'lg:col-span-2 lg:row-span-2'
      )}
    >
      <Link href={`/blog/${post.slug}`} className="block h-full">
        <div className={cn(
          'relative overflow-hidden bg-surface-secondary',
          featured ? 'aspect-[16/9]' : 'aspect-[16/10]'
        )}>
          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              sizes={featured ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-tertiary">
              <span className="text-6xl opacity-20" aria-hidden="true">🏃</span>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-full">
              {post.category.name}
            </span>
          </div>
        </div>

        <div className={cn('p-5', featured && 'lg:p-8')}>
          <div className="flex items-center gap-4 text-xs text-muted mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.published_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.readTime} min read
            </span>
          </div>

          <h2 className={cn(
            'font-display font-semibold text-foreground group-hover:text-brand transition-colors mb-3',
            featured ? 'text-2xl lg:text-3xl' : 'text-lg'
          )}>
            {post.title}
          </h2>

          <p className={cn(
            'text-secondary line-clamp-2',
            featured ? 'text-base lg:line-clamp-3' : 'text-sm'
          )}>
            {post.excerpt}
          </p>

          <div className="flex items-center gap-1 mt-4 text-brand font-medium text-sm group-hover:gap-2 transition-all">
            Read More
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function BlogPageClient({
  posts,
  categories,
}: {
  posts: Post[];
  categories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get('category') || 'all';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const initialSearch = searchParams.get('q') || '';

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const filteredPosts = useMemo(() => {
    let result = posts;

    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category.slug === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q)
      );
    }

    return result;
  }, [posts, activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = filteredPosts.slice(
    (safePage - 1) * POSTS_PER_PAGE,
    safePage * POSTS_PER_PAGE
  );

  function updateUrl(category: string, page: number, q: string) {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (page > 1) params.set('page', String(page));
    if (q.trim()) params.set('q', q);
    const qs = params.toString();
    router.replace(`/blog${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  function handleCategoryChange(slug: string) {
    setActiveCategory(slug);
    setCurrentPage(1);
    updateUrl(slug, 1, searchQuery);
  }

  function handleSearch(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
    updateUrl(activeCategory, 1, value);
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
    updateUrl(activeCategory, page, searchQuery);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const pageNumbers = (() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  })();

  return (
    <>
      {/* Filters */}
      <section className="py-8 border-b border-border bg-background sticky top-16 lg:top-20 z-30">
        <div className="container">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryChange(category.slug)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all',
                      activeCategory === category.slug
                        ? 'bg-brand text-white'
                        : 'bg-surface-secondary text-secondary hover:bg-brand/10 hover:text-brand'
                    )}
                  >
                    {category.name}
                    <span className="ml-1 opacity-60">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-border rounded-full text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-12 lg:py-16 bg-background">
        <div className="container">
          {paginatedPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted">No posts found.</p>
              {(searchQuery || activeCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                    setCurrentPage(1);
                    updateUrl('all', 1, '');
                  }}
                  className="mt-4 text-brand hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {safePage === 1 && paginatedPosts[0] && (
                <PostCard post={paginatedPosts[0]} featured />
              )}
              {(safePage === 1 ? paginatedPosts.slice(1) : paginatedPosts).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center">
              <nav className="flex items-center gap-2" aria-label="Blog pagination">
                <button
                  onClick={() => handlePageChange(safePage - 1)}
                  disabled={safePage <= 1}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    safePage <= 1
                      ? 'bg-surface-secondary text-muted cursor-not-allowed'
                      : 'bg-surface-secondary text-secondary hover:bg-brand/10 hover:text-brand'
                  )}
                >
                  Previous
                </button>

                {pageNumbers.map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="text-muted px-1">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors',
                        p === safePage
                          ? 'bg-brand text-white'
                          : 'bg-surface-secondary text-secondary hover:bg-brand/10 hover:text-brand'
                      )}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    safePage >= totalPages
                      ? 'bg-surface-secondary text-muted cursor-not-allowed'
                      : 'bg-surface-secondary text-secondary hover:bg-brand/10 hover:text-brand'
                  )}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
