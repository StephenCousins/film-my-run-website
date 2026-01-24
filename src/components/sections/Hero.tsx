'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Play, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// HERO SECTION
// ============================================
// Full-screen hero with:
// - Looping video background
// - Parallax scroll effect (GSAP)
// - Animated text reveal
// - Scroll indicator

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize GSAP animations
  useEffect(() => {
    let ctx: any;

    const initGSAP = async () => {
      try {
        const gsap = (await import('gsap')).default;
        const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
        gsap.registerPlugin(ScrollTrigger);

        const section = sectionRef.current;
        const video = videoRef.current;
        const content = contentRef.current;

        if (!section || !content) return;

        // Create a context for cleanup
        ctx = gsap.context(() => {
          // Initial animation - text reveal
          const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

          timeline
            .fromTo('.hero-tag',
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.8, delay: 0.2 }
            )
            .fromTo('.hero-title-line',
              { opacity: 0, y: 40 },
              { opacity: 1, y: 0, stagger: 0.15, duration: 0.8 },
              '-=0.4'
            )
            .fromTo('.hero-subtitle',
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.6 },
              '-=0.3'
            )
            .fromTo('.hero-cta',
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, stagger: 0.1, duration: 0.6 },
              '-=0.2'
            )
            .fromTo('.hero-scroll',
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.6 },
              '-=0.2'
            );

          // Parallax effect on video
          if (video) {
            gsap.to(video, {
              yPercent: 30,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top top',
                end: 'bottom top',
                scrub: true,
              },
            });
          }

          // Fade out content on scroll (start after some scroll)
          gsap.to(content, {
            opacity: 0,
            y: -50,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: '15% top',
              end: '65% top',
              scrub: true,
            },
          });
        }, section);

      } catch (error) {
        console.warn('GSAP not loaded, animations disabled');
      }
    };

    initGSAP();

    // Cleanup on unmount
    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  // Video loaded handler
  const handleVideoLoaded = () => {
    setIsLoaded(true);
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative h-screen min-h-[700px] w-full overflow-hidden"
    >
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={handleVideoLoaded}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-1000',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          poster="/images/hero/hero-main.jpg"
        >
          {/* Will be replaced with actual video URLs */}
          <source src="/videos/hero-loop.mp4" type="video/mp4" />
          <source src="/videos/hero-loop.webm" type="video/webm" />
        </video>

        {/* Fallback image while loading */}
        <div
          className={cn(
            'absolute inset-0 bg-zinc-200 dark:bg-zinc-900 transition-opacity duration-1000',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
          style={{
            backgroundImage: 'url(/images/hero/hero-main.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="relative h-full flex items-center"
      >
        <div className="container">
          <div className="max-w-4xl">
            {/* Tag */}
            <div className="hero-tag inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-orange-400 text-sm font-medium">Filming Since 2011</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-[0.95] tracking-tight mb-6">
              <span className="hero-title-line block">Every Stride</span>
              <span className="hero-title-line block">Deserves Its</span>
              <span className="hero-title-line block text-orange-500">Story</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle text-zinc-300 text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
              From parkruns to ultramarathons, we capture the moments that matter.
              Tools for runners, films that inspire.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/films"
                className="hero-cta group inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all hover:scale-105"
              >
                <Play className="w-5 h-5 fill-current" />
                Watch Films
              </Link>
              <Link
                href="/tools/calculators"
                className="hero-cta inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all hover:scale-105"
              >
                Running Tools
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sound toggle */}
      <button
        onClick={toggleMute}
        className="absolute bottom-8 right-8 p-3 bg-black/30 backdrop-blur-sm rounded-full border border-white/10 text-white hover:bg-black/50 transition-colors z-10"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      {/* Scroll indicator */}
      <div className="hero-scroll absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60">
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </div>
    </section>
  );
}
