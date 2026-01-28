import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowLeft, Twitter, Facebook, Linkedin, Tag, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import prisma from '@/lib/db';

// Force dynamic rendering - fetch data at runtime, not build time
export const dynamic = 'force-dynamic';

// ============================================
// TYPES
// ============================================

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string | null;
  published_at: string;
  readTime: number;
  category: {
    name: string;
    slug: string;
  };
  tags: { name: string; slug: string }[];
  author: {
    name: string;
    avatar: string;
    bio: string;
  };
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  featuredImage: string | null;
  readTime: number;
  category: {
    name: string;
    slug: string;
  };
}

// Default author info
const defaultAuthor = {
  name: 'Stephen Cousins',
  avatar: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/about/stephen-avatar.svg',
  bio: 'Runner, filmmaker, and tool builder. Documenting every mile since 2011.',
};

// ============================================
// DATA FETCHING
// ============================================

async function getPostBySlug(slug: string) {
  const post = await prisma.posts.findUnique({
    where: { slug },
    include: {
      post_terms: {
        include: {
          terms: true,
        },
      },
    },
  });

  if (!post) return null;

  const categoryTerm = post.post_terms.find((pt) => pt.terms.taxonomy === 'category');
  const tags = post.post_terms.map((pt) => ({
    name: pt.terms.name,
    slug: pt.terms.slug,
  }));

  return {
    id: post.id.toString(),
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
    featuredImage: post.featured_image,
    publishedAt: post.published_at?.toISOString() || post.created_at.toISOString(),
    readTime: post.read_time,
    category: categoryTerm
      ? { name: categoryTerm.terms.name, slug: categoryTerm.terms.slug }
      : { name: 'Running', slug: 'running' },
    tags: tags.length > 0 ? tags : [{ name: 'Running', slug: 'running' }],
    author: defaultAuthor,
  };
}

async function getRelatedPosts(currentSlug: string): Promise<RelatedPost[]> {
  const posts = await prisma.posts.findMany({
    where: {
      slug: { not: currentSlug },
      status: 'published',
      post_type: 'post',
    },
    orderBy: { published_at: 'desc' },
    take: 3,
    include: {
      post_terms: {
        include: {
          terms: true,
        },
      },
    },
  });

  return posts.map((post) => {
    const categoryTerm = post.post_terms.find((pt) => pt.terms.taxonomy === 'category');

    return {
      id: post.id.toString(),
      title: post.title,
      slug: post.slug,
      featuredImage: post.featured_image,
      readTime: post.read_time,
      category: categoryTerm
        ? { name: categoryTerm.terms.name, slug: categoryTerm.terms.slug }
        : { name: 'Running', slug: 'running' },
    };
  });
}


// ============================================
// METADATA
// ============================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found | Film My Run',
    };
  }

  return {
    title: `${post.title} | Film My Run`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
  };
}


// ============================================
// SHARE BUTTONS
// ============================================

function ShareButtons({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500 dark:text-zinc-400 mr-2">Share:</span>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-zinc-800 hover:bg-blue-500 hover:text-white transition-colors"
        aria-label="Share on Twitter"
      >
        <Twitter className="w-4 h-4" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-zinc-800 hover:bg-blue-600 hover:text-white transition-colors"
        aria-label="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </a>
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-zinc-800 hover:bg-blue-700 hover:text-white transition-colors"
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </a>
    </div>
  );
}

// ============================================
// BLOG POST PAGE
// ============================================

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(slug);
  const postUrl = `https://filmmyrun.co.uk/blog/${post.slug}`;

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="relative">
          {/* Featured image */}
          <div className="relative h-[40vh] lg:h-[60vh] bg-zinc-900">
            {post.featuredImage ? (
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-9xl opacity-20">🏃</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
          </div>

          {/* Title overlay */}
          <div className="container relative -mt-32 lg:-mt-48 z-10">
            <div className="max-w-4xl">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                <Link href="/blog" className="hover:text-orange-500 transition-colors">
                  Blog
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link
                  href={`/blog/category/${post.category.slug}`}
                  className="hover:text-orange-500 transition-colors"
                >
                  {post.category.name}
                </Link>
              </nav>

              {/* Category badge */}
              <Link
                href={`/blog/category/${post.category.slug}`}
                className="inline-block px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-full mb-4 hover:bg-orange-600 transition-colors"
              >
                {post.category.name}
              </Link>

              {/* Title */}
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
                    {post.author.avatar && (
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="text-white font-medium">{post.author.name}</span>
                </div>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {post.readTime} min read
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 lg:py-16 bg-zinc-950">
          <div className="container">
            <div className="grid lg:grid-cols-12 gap-12">
              {/* Main content */}
              <article className="lg:col-span-8">
                {/* Prose content */}
                <div
                  className="prose prose-lg dark:prose-invert prose-orange max-w-none
                    prose-headings:font-display prose-headings:font-bold
                    prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6
                    prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                    prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed
                    prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-orange-500 prose-blockquote:bg-zinc-900 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-xl
                    prose-ul:space-y-2 prose-li:text-zinc-700 dark:prose-li:text-zinc-300
                    prose-strong:text-zinc-900 dark:prose-strong:text-white
                    prose-img:rounded-xl"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Tags */}
                <div className="mt-12 pt-8 border-t border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="w-4 h-4 text-zinc-400" />
                    {post.tags.map((tag) => (
                      <Link
                        key={tag.slug}
                        href={`/blog/tag/${tag.slug}`}
                        className="px-3 py-1 bg-zinc-800 text-zinc-300 text-sm rounded-full hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Share */}
                <div className="mt-8 pt-8 border-t border-zinc-800">
                  <ShareButtons url={postUrl} title={post.title} />
                </div>

                {/* Author bio */}
                <div className="mt-12 p-6 bg-zinc-900 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                      {post.author.avatar && (
                        <Image
                          src={post.author.avatar}
                          alt={post.author.name}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white mb-1">
                        {post.author.name}
                      </h3>
                      <p className="text-zinc-400 text-sm">
                        {post.author.bio}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              {/* Sidebar */}
              <aside className="lg:col-span-4">
                <div className="lg:sticky lg:top-28 space-y-8">
                  {/* Back to blog */}
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Blog
                  </Link>

                  {/* Related posts */}
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white mb-4">
                      Related Posts
                    </h3>
                    <div className="space-y-4">
                      {relatedPosts.map((relatedPost) => (
                        <Link
                          key={relatedPost.id}
                          href={`/blog/${relatedPost.slug}`}
                          className="group flex gap-4"
                        >
                          <div className="w-20 h-20 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                            {relatedPost.featuredImage && (
                              <Image
                                src={relatedPost.featuredImage}
                                alt={relatedPost.title}
                                width={80}
                                height={80}
                                className="object-cover w-full h-full"
                              />
                            )}
                          </div>
                          <div>
                            <span className="text-xs text-orange-500 font-medium">
                              {relatedPost.category.name}
                            </span>
                            <h4 className="font-medium text-white group-hover:text-orange-500 transition-colors line-clamp-2 text-sm mt-1">
                              {relatedPost.title}
                            </h4>
                            <span className="text-xs text-zinc-500 mt-1 block">
                              {relatedPost.readTime} min read
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Newsletter */}
                  <div className="p-6 bg-zinc-900 rounded-2xl">
                    <h3 className="font-display text-lg font-semibold text-white mb-2">
                      Subscribe
                    </h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      Get new posts delivered to your inbox.
                    </p>
                    <form className="space-y-3">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                      />
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Subscribe
                      </button>
                    </form>
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
