import { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import Header from '@/components/layout/Header';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import Footer from '@/components/layout/Footer';
import BlogPageClient from '@/components/blog/BlogPageClient';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog | Film My Run',
  alternates: { canonical: 'https://filmmyrun.co.uk/blog' },
  description: 'Running stories, race reports, gear reviews, and training insights from 15 years of running and filming.',
  keywords: [
    'running blog',
    'race reports',
    'ultra running stories',
    'trail running blog',
    'marathon race report',
  ],
  openGraph: {
    title: 'Blog | Film My Run',
    description: 'Running stories, race reports, gear reviews, and training insights.',
  },
};

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

async function getPosts(): Promise<Post[]> {
  const posts = await prisma.posts.findMany({
    where: {
      status: 'published',
      post_type: 'post',
    },
    orderBy: {
      published_at: 'desc',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featured_image: true,
      published_at: true,
      created_at: true,
      read_time: true,
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
      excerpt: post.excerpt || '',
      featuredImage: post.featured_image,
      published_at: post.published_at?.toISOString() || post.created_at.toISOString(),
      readTime: post.read_time,
      category: categoryTerm
        ? { name: categoryTerm.terms.name, slug: categoryTerm.terms.slug }
        : { name: 'Running', slug: 'running' },
    };
  });
}

function getCategories(posts: Post[]): Category[] {
  const categoryMap = new Map<string, number>();
  posts.forEach((post) => {
    const count = categoryMap.get(post.category.slug) || 0;
    categoryMap.set(post.category.slug, count + 1);
  });

  return [
    { name: 'All Posts', slug: 'all', count: posts.length },
    ...Array.from(categoryMap.entries()).map(([slug, count]) => {
      const post = posts.find((p) => p.category.slug === slug);
      return { name: post?.category.name || slug, slug, count };
    }),
  ];
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://filmmyrun.co.uk' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://filmmyrun.co.uk/blog' },
  ],
};

export default async function BlogPage() {
  const posts = await getPosts();
  const categories = getCategories(posts);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />

      <main id="main-content" className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/2020/03/transgrancanaria2020-18777-1-scaled.jpg"
              alt="Trail running"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[rgb(var(--color-background))]" />
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

        <Suspense fallback={null}>
          <BlogPageClient posts={posts} categories={categories} />
        </Suspense>

        {/* Newsletter CTA */}
        <section className="py-16 lg:py-24 bg-surface-secondary">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Never Miss a Post
              </h2>
              <p className="text-secondary mb-8">
                Get the latest race reports, training tips, and running stories delivered
                straight to your inbox.
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
