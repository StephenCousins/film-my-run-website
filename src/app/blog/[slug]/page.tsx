import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowLeft, Twitter, Facebook, Linkedin, Tag, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import { prisma } from '@/lib/db';
import { sanitizeContent } from '@/lib/sanitize';

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
  avatar: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/about/stephen.jpg',
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
    updatedAt: post.updated_at.toISOString(),
    readTime: post.read_time,
    category: categoryTerm
      ? { name: categoryTerm.terms.name, slug: categoryTerm.terms.slug }
      : { name: 'Running', slug: 'running' },
    tags: tags.length > 0 ? tags : [{ name: 'Running', slug: 'running' }],
    author: defaultAuthor,
  };
}

async function getRelatedPosts(currentSlug: string): Promise<RelatedPost[]> {
  const currentPost = await prisma.posts.findUnique({
    where: { slug: currentSlug },
    select: {
      id: true,
      post_terms: { select: { term_id: true } },
    },
  });

  const termIds = currentPost?.post_terms.map((pt) => pt.term_id) ?? [];

  let posts = termIds.length > 0
    ? await prisma.posts.findMany({
        where: {
          slug: { not: currentSlug },
          status: 'published',
          post_type: 'post',
          post_terms: { some: { term_id: { in: termIds } } },
        },
        orderBy: { published_at: 'desc' },
        take: 3,
        include: { post_terms: { include: { terms: true } } },
      })
    : [];

  if (posts.length < 3) {
    const existingSlugs = posts.map((p) => p.slug);
    const fallback = await prisma.posts.findMany({
      where: {
        slug: { notIn: [currentSlug, ...existingSlugs] },
        status: 'published',
        post_type: 'post',
      },
      orderBy: { published_at: 'desc' },
      take: 3 - posts.length,
      include: { post_terms: { include: { terms: true } } },
    });
    posts = [...posts, ...fallback];
  }

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
    alternates: {
      canonical: `https://filmmyrun.co.uk/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
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
      <span className="text-sm text-muted mr-2">Share:</span>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-surface-tertiary hover:bg-blue-500 hover:text-white transition-colors"
        aria-label="Share on Twitter"
      >
        <Twitter className="w-4 h-4" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-surface-tertiary hover:bg-blue-600 hover:text-white transition-colors"
        aria-label="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </a>
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-surface-tertiary hover:bg-blue-700 hover:text-white transition-colors"
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

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: 'https://filmmyrun.co.uk/about',
    },
    publisher: {
      '@id': 'https://filmmyrun.co.uk/#organization',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    keywords: post.tags.map((t) => t.name).join(', '),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://filmmyrun.co.uk',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: 'https://filmmyrun.co.uk/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: postUrl,
      },
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
          {/* Featured image */}
          <div className="relative h-[40vh] lg:h-[60vh] bg-surface">
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
            <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--color-background))] via-black/50 to-black/70" />
          </div>

          {/* Title overlay */}
          <div className="container relative -mt-32 lg:-mt-48 z-10">
            <div className="max-w-4xl">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-muted mb-4">
                <Link href="/blog" className="hover:text-brand transition-colors">
                  Blog
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link
                  href={`/blog?category=${post.category.slug}`}
                  className="hover:text-brand transition-colors"
                >
                  {post.category.name}
                </Link>
              </nav>

              {/* Category badge */}
              <Link
                href={`/blog?category=${post.category.slug}`}
                className="inline-block px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-full mb-4 hover:bg-orange-600 transition-colors"
              >
                {post.category.name}
              </Link>

              {/* Title */}
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-surface-tertiary overflow-hidden">
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
        <section className="py-12 lg:py-16 bg-background">
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
                    prose-p:text-secondary prose-p:leading-relaxed
                    prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-orange-500 prose-blockquote:bg-surface prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-xl
                    prose-ul:space-y-2 prose-li:text-secondary
                    prose-strong:text-foreground
                    prose-img:rounded-xl"
                  dangerouslySetInnerHTML={{ __html: sanitizeContent(post.content) }}
                />

                {/* Tags */}
                <div className="mt-12 pt-8 border-t border-border">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="w-4 h-4 text-muted" />
                    {post.tags.map((tag) => (
                      <Link
                        key={tag.slug}
                        href={`/blog?category=${tag.slug}`}
                        className="px-3 py-1 bg-surface-tertiary text-secondary text-sm rounded-full hover:bg-brand/10 hover:text-brand transition-colors"
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Share */}
                <div className="mt-8 pt-8 border-t border-border">
                  <ShareButtons url={postUrl} title={post.title} />
                </div>

                {/* Author bio */}
                <div className="mt-12 p-6 bg-surface rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-surface-tertiary overflow-hidden flex-shrink-0">
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
                      <h3 className="font-display font-semibold text-foreground mb-1">
                        {post.author.name}
                      </h3>
                      <p className="text-muted text-sm">
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
                    className="inline-flex items-center gap-2 text-muted hover:text-brand transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Blog
                  </Link>

                  {/* Related posts */}
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                      Related Posts
                    </h3>
                    <div className="space-y-4">
                      {relatedPosts.map((relatedPost) => (
                        <Link
                          key={relatedPost.id}
                          href={`/blog/${relatedPost.slug}`}
                          className="group flex gap-4"
                        >
                          <div className="w-20 h-20 rounded-lg bg-surface-tertiary overflow-hidden flex-shrink-0">
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
                            <h4 className="font-medium text-foreground group-hover:text-brand transition-colors line-clamp-2 text-sm mt-1">
                              {relatedPost.title}
                            </h4>
                            <span className="text-xs text-muted mt-1 block">
                              {relatedPost.readTime} min read
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Newsletter */}
                  <div className="p-6 bg-surface rounded-2xl">
                    <NewsletterForm
                      variant="stacked"
                      theme="dark"
                      heading="Subscribe"
                      description="Get new posts delivered to your inbox."
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
