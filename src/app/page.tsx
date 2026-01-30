/**
 * Film My Run - Homepage
 *
 * See HOMEPAGE_CONCEPT.md for detailed wireframes and animations.
 */

import {
  Hero,
  StatsBanner,
  FeaturedFilm,
  ToolsShowcase,
  LatestPosts,
  ServicesTeaser,
  TrainingCTA,
  ShopTeaser,
} from '@/components/sections';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CustomCursor from '@/components/animations/CustomCursor';
import prisma from '@/lib/db';

// Force dynamic rendering - fetch data at runtime, not build time
export const dynamic = 'force-dynamic';

// Fetch latest 4 posts from database
async function getLatestPosts() {
  const posts = await prisma.posts.findMany({
    where: {
      status: 'published',
      post_type: 'post',
    },
    orderBy: {
      published_at: 'desc',
    },
    take: 4,
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
      excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
      featuredImage: post.featured_image,
      published_at: post.published_at?.toISOString() || post.created_at.toISOString(),
      readTime: post.read_time,
      category: categoryTerm
        ? { name: categoryTerm.terms.name, slug: categoryTerm.terms.slug }
        : { name: 'Running', slug: 'running' },
    };
  });
}

export default async function HomePage() {
  // Fetch latest posts from database
  const latestPosts = await getLatestPosts();

  return (
    <>
      {/* Custom cursor for desktop */}
      <CustomCursor />

      {/* Header */}
      <Header />

      <main>
        {/* Section 1: Hero with video background */}
        <Hero />

        {/* Section 2: Stats Banner with animated counters */}
        <StatsBanner />

        {/* Section 3: Featured Film showcase */}
        <FeaturedFilm />

        {/* Section 4: Tools horizontal scroll */}
        <ToolsShowcase />

        {/* Section 5: Latest Blog Posts */}
        <LatestPosts posts={latestPosts} />

        {/* Section 6: Services Teaser */}
        <ServicesTeaser />

        {/* Section 7: Training CTA (Marathon Plan App) */}
        <TrainingCTA />

        {/* Section 8: Shop Teaser */}
        <ShopTeaser />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
