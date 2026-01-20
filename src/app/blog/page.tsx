import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, Search, Filter, BookOpen } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import prisma from '@/lib/db';

// Force dynamic rendering - fetch data at runtime, not build time
export const dynamic = 'force-dynamic';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Blog | Film My Run',
  description: 'Running stories, race reports, gear reviews, and training insights from 15 years of running and filming.',
  openGraph: {
    title: 'Blog | Film My Run',
    description: 'Running stories, race reports, gear reviews, and training insights.',
  },
};

// ============================================
// TYPES
// ============================================

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string | null;
  publishedAt: string;
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

// ============================================
// DATA FETCHING
// ============================================

async function getPosts() {
  const posts = await prisma.post.findMany({
    where: {
      status: 'published',
      postType: 'post',
    },
    orderBy: {
      publishedAt: 'desc',
    },
    include: {
      terms: {
        include: {
          term: true,
        },
      },
    },
  });

  return posts.map((post) => {
    // Find the first category term, or default
    const categoryTerm = post.terms.find((pt) => pt.term.taxonomy === 'category');

    return {
      id: post.id.toString(),
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
      featuredImage: post.featuredImage,
      publishedAt: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      readTime: post.readTime,
      category: categoryTerm
        ? { name: categoryTerm.term.name, slug: categoryTerm.term.slug }
        : { name: 'Running', slug: 'running' },
    };
  });
}

async function getCategories(posts: Post[]) {
  const categoryMap = new Map<string, number>();
  posts.forEach((post) => {
    const count = categoryMap.get(post.category.slug) || 0;
    categoryMap.set(post.category.slug, count + 1);
  });

  const categories: Category[] = [
    { name: 'All Posts', slug: 'all', count: posts.length },
    ...Array.from(categoryMap.entries()).map(([slug, count]) => {
      const post = posts.find((p) => p.category.slug === slug);
      return { name: post?.category.name || slug, slug, count };
    }),
  ];

  return categories;
}

// ============================================
// POST CARD COMPONENT
// ============================================

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return (
    <article
      className={cn(
        'group bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        featured && 'lg:col-span-2 lg:row-span-2'
      )}
    >
      <Link href={`/blog/${post.slug}`} className="block h-full">
        {/* Image */}
        <div className={cn(
          'relative overflow-hidden bg-zinc-800',
          featured ? 'aspect-[16/9]' : 'aspect-[16/10]'
        )}>
          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl opacity-20">🏃</span>
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-full">
              {post.category.name}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={cn('p-5', featured && 'lg:p-8')}>
          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.publishedAt).toLocaleDateString('en-GB', {
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

          {/* Title */}
          <h2 className={cn(
            'font-display font-semibold text-white group-hover:text-orange-500 transition-colors mb-3',
            featured ? 'text-2xl lg:text-3xl' : 'text-lg'
          )}>
            {post.title}
          </h2>

          {/* Excerpt */}
          <p className={cn(
            'text-zinc-400 line-clamp-2',
            featured ? 'text-base lg:line-clamp-3' : 'text-sm'
          )}>
            {post.excerpt}
          </p>

          {/* Read more */}
          <div className="flex items-center gap-1 mt-4 text-orange-500 font-medium text-sm group-hover:gap-2 transition-all">
            Read More
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    </article>
  );
}

// ============================================
// CATEGORY FILTER
// ============================================

function CategoryFilter({ categories, activeSlug = 'all' }: { categories: Category[]; activeSlug?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={category.slug === 'all' ? '/blog' : `/blog/category/${category.slug}`}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all',
            activeSlug === category.slug
              ? 'bg-orange-500 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-orange-500/10 hover:text-orange-500'
          )}
        >
          {category.name}
          <span className="ml-1 opacity-60">({category.count})</span>
        </Link>
      ))}
    </div>
  );
}

// ============================================
// BLOG PAGE
// ============================================

export default async function BlogPage() {
  // Fetch posts from database
  const posts = await getPosts();
  const categories = await getCategories(posts);

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <Image
              src="https://filmmyrun.co.uk/wp-content/uploads/2020/03/transgrancanaria2020-18777-1-scaled.jpg"
              alt="Trail running"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/70 to-zinc-950" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <BookOpen className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Stories & Insights</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Blog
              </h1>
              <p className="text-lg text-zinc-300 max-w-2xl">
                Race reports, training insights, gear reviews, and stories from 15 years
                of running and filming. Every mile has a story.
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 border-b border-zinc-800 bg-zinc-950 sticky top-16 lg:top-20 z-30">
          <div className="container">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Category filters */}
              <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
                <CategoryFilter categories={categories} />
              </div>

              {/* Search */}
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="search"
                  placeholder="Search posts..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-transparent rounded-full text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Posts grid */}
        <section className="py-12 lg:py-16 bg-zinc-950">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Featured post */}
              {posts[0] && <PostCard post={posts[0]} featured />}

              {/* Regular posts */}
              {posts.slice(1).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-12 flex justify-center">
              <nav className="flex items-center gap-2">
                <button
                  disabled
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-400 cursor-not-allowed"
                >
                  Previous
                </button>
                {[1, 2, 3].map((page) => (
                  <Link
                    key={page}
                    href={`/blog?page=${page}`}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors',
                      page === 1
                        ? 'bg-orange-500 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-orange-500/10 hover:text-orange-500'
                    )}
                  >
                    {page}
                  </Link>
                ))}
                <span className="text-zinc-400">...</span>
                <Link
                  href="/blog?page=12"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-orange-500/10 hover:text-orange-500"
                >
                  12
                </Link>
                <Link
                  href="/blog?page=2"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-orange-500/10 hover:text-orange-500"
                >
                  Next
                </Link>
              </nav>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 lg:py-24 bg-zinc-900">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
                Never Miss a Post
              </h2>
              <p className="text-zinc-400 mb-8">
                Get the latest race reports, training tips, and running stories delivered
                straight to your inbox.
              </p>
              <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-full text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors whitespace-nowrap"
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
