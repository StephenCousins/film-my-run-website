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

export default function HomePage() {
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
        <LatestPosts />

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
