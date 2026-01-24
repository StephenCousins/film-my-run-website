'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Mountain, Calendar, ArrowRight, X, Route, Timer } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface FeaturedVideoData {
  title: string;
  subtitle: string;
  description: string;
  videoId: string;
  thumbnail: string;
  year: string | null;
  location: string;
  stats: {
    distance: string;
    elevation: string;
    time: string;
  };
  totalVideos: number;
  currentIndex: number;
}

// ============================================
// VIDEO MODAL
// ============================================

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
}

function VideoModal({ isOpen, onClose, videoId, title }: VideoModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl mx-4 aspect-video">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white transition-colors"
          aria-label="Close video"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video iframe */}
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-xl"
        />
      </div>
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content skeleton */}
          <div className="order-2 lg:order-1 animate-pulse">
            <div className="h-6 w-32 bg-zinc-300 dark:bg-zinc-800 rounded-full mb-6" />
            <div className="h-12 w-3/4 bg-zinc-300 dark:bg-zinc-800 rounded mb-4" />
            <div className="h-6 w-1/2 bg-zinc-300 dark:bg-zinc-800 rounded mb-6" />
            <div className="h-20 w-full bg-zinc-300 dark:bg-zinc-800 rounded mb-8" />
            <div className="h-24 w-full bg-zinc-300 dark:bg-zinc-800 rounded mb-8" />
            <div className="flex gap-4">
              <div className="h-12 w-36 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
              <div className="h-12 w-36 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
            </div>
          </div>

          {/* Thumbnail skeleton */}
          <div className="order-1 lg:order-2">
            <div className="aspect-video bg-zinc-300 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// FEATURED FILM SECTION
// ============================================

export default function FeaturedFilm() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [video, setVideo] = useState<FeaturedVideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch featured video
  useEffect(() => {
    async function fetchFeaturedVideo() {
      try {
        const res = await fetch('/api/featured-video');
        const data = await res.json();

        if (!data.ok) {
          throw new Error(data.error || 'Failed to load featured video');
        }

        setVideo(data.video);
      } catch (err) {
        console.error('Failed to fetch featured video:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeaturedVideo();
  }, []);

  // Initialize GSAP animations
  useEffect(() => {
    if (isLoading || !video) return;

    let ctx: ReturnType<typeof import('gsap').gsap.context> | undefined;

    const initGSAP = async () => {
      try {
        const gsap = (await import('gsap')).default;
        const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
        gsap.registerPlugin(ScrollTrigger);

        const section = sectionRef.current;
        if (!section) return;

        ctx = gsap.context(() => {
          // Parallax on thumbnail
          gsap.to(section.querySelector('.film-thumbnail'), {
            yPercent: -10,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });

          // Fade in content
          gsap.fromTo(
            section.querySelector('.film-content'),
            { opacity: 0, x: -30 },
            {
              opacity: 1,
              x: 0,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 70%',
                once: true,
              },
            }
          );

          // Fade in stats
          gsap.fromTo(
            section.querySelectorAll('.film-stat'),
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.1,
              duration: 0.6,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section.querySelector('.film-stats'),
                start: 'top 80%',
                once: true,
              },
            }
          );
        }, section);
      } catch (error) {
        console.warn('GSAP not loaded');
      }
    };

    initGSAP();

    return () => {
      if (ctx) ctx.revert();
    };
  }, [isLoading, video]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state - hide section
  if (error || !video) {
    return null;
  }

  return (
    <>
      <section
        ref={sectionRef}
        className="relative py-24 lg:py-32 overflow-hidden bg-zinc-100 dark:bg-zinc-950"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Content */}
            <div className="film-content order-2 lg:order-1">
              {/* Tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-full border border-orange-500/20 mb-6">
                <span className="text-orange-500 text-sm font-medium">
                  Featured Film ({video.currentIndex}/{video.totalVideos})
                </span>
              </div>

              {/* Title */}
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white mb-4">
                {video.title}
              </h2>

              {/* Subtitle */}
              <p className="text-xl text-zinc-600 dark:text-zinc-400 italic mb-6">
                {video.subtitle}
              </p>

              {/* Description */}
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8 max-w-lg">
                {video.description}
              </p>

              {/* Meta info */}
              <div className="flex flex-wrap gap-6 mb-8 text-sm text-zinc-500 dark:text-zinc-500">
                {video.year && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {video.year}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mountain className="w-4 h-4" />
                  {video.location}
                </div>
              </div>

              {/* Stats */}
              <div className="film-stats grid grid-cols-3 gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-8">
                <div className="film-stat text-center">
                  <div className="font-mono text-xl font-bold text-orange-500">
                    {video.stats.distance}
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider flex items-center justify-center gap-1">
                    <Route className="w-3 h-3" />
                    Distance
                  </div>
                </div>
                <div className="film-stat text-center border-x border-zinc-200 dark:border-zinc-800">
                  <div className="font-mono text-xl font-bold text-orange-500">
                    {video.stats.elevation}
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider flex items-center justify-center gap-1">
                    <Mountain className="w-3 h-3" />
                    Elevation
                  </div>
                </div>
                <div className="film-stat text-center">
                  <div className="font-mono text-xl font-bold text-orange-500">
                    {video.stats.time}
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider flex items-center justify-center gap-1">
                    <Timer className="w-3 h-3" />
                    Time
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all hover:scale-105"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Watch Now
                </button>
                <Link
                  href="/films"
                  className="inline-flex items-center gap-2 px-6 py-3 text-zinc-700 dark:text-white font-medium hover:text-orange-500 transition-colors group"
                >
                  Browse All Films
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Thumbnail */}
            <div className="order-1 lg:order-2">
              <div
                className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => setIsModalOpen(true)}
                data-cursor="image"
              >
                {/* Image */}
                <div className="film-thumbnail absolute inset-0 scale-110">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    unoptimized // YouTube thumbnails are external
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/30">
                    <Play className="w-8 h-8 text-white fill-current ml-1" />
                  </div>
                </div>

                {/* Stats badge */}
                <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm font-mono">
                  {video.stats.distance}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </section>

      {/* Video Modal */}
      <VideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoId={video.videoId}
        title={video.title}
      />
    </>
  );
}
