'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { blogPosts } from '@/data/blog-posts';

// ============================================
// TYPES
// ============================================

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  featuredImage: string | null;
  publishedAt: string;
  readTime: number;
  category: {
    name: string;
    slug: string;
  };
}

// ============================================
// POST CARD COMPONENT
// ============================================

interface PostCardProps {
  post: BlogPost;
  featured?: boolean;
}

function PostCard({ post, featured = false }: PostCardProps) {
  return (
    <article
      className="blog-card group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 transition-all duration-300 h-full"
    >
      <Link href={`/blog/${post.slug}`} className="block h-full">
        {/* Image */}
        <div className="relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 aspect-[16/10]">
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
            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full">
              {post.category.name}
            </span>
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content */}
        <div className="p-5">
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
          <h3 className="font-display text-lg md:text-xl font-semibold text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-2 mb-2">
            {post.title}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
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
// LATEST POSTS SECTION
// ============================================

interface LatestPostsProps {
  posts?: BlogPost[];
}

export default function LatestPosts({ posts = blogPosts }: LatestPostsProps) {
  const sectionRef = useRef<HTMLElement>(null);

  // Initialize GSAP animations with pop-out effect
  useEffect(() => {
    let ctx: any;

    const initGSAP = async () => {
      try {
        const gsap = (await import('gsap')).default;
        const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
        gsap.registerPlugin(ScrollTrigger);

        const section = sectionRef.current;
        if (!section) return;

        ctx = gsap.context(() => {
          // Pop-out effect: cards scale from small to big as they scroll into view
          const cards = section.querySelectorAll('.blog-card');

          cards.forEach((card, index) => {
            // Initial state - smaller scale
            gsap.set(card, {
              scale: 0.85,
              opacity: 0.6,
              transformOrigin: 'center center'
            });

            // Create scrub animation for each card
            gsap.to(card, {
              scale: 1,
              opacity: 1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 90%',
                end: 'top 50%',
                scrub: 0.5,
              },
            });
          });
        }, section);
      } catch (error) {
        console.warn('GSAP not loaded');
      }
    };

    initGSAP();

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 bg-white dark:bg-zinc-950"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div className="container">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <span className="text-orange-500 text-sm font-semibold uppercase tracking-wider">
              From the Blog
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mt-2">
              Latest Stories
            </h2>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors group"
          >
            View All Posts
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Posts grid - Clean 2x2 layout on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {posts.slice(0, 4).map((post, index) => (
            <PostCard key={post.id} post={post} featured={index === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
