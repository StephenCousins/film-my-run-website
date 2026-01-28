'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Calendar, Mountain, X, Route, Timer } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface Film {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  thumbnail: string;
  videoId: string;
  year: string | null;
  location: string;
  stats: {
    distance: string | null;
    elevation: string | null;
    time: string | null;
  };
}

// ============================================
// VIDEO MODAL
// ============================================

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  film: Film | null;
}

function VideoModal({ isOpen, onClose, film }: VideoModalProps) {
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

  if (!isOpen || !film) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white transition-colors"
          aria-label="Close video"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video */}
        <div className="aspect-video rounded-xl overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${film.videoId}?autoplay=1&rel=0`}
            title={film.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Info below video */}
        <div className="mt-4 text-white">
          <h3 className="font-display text-xl font-bold">{film.title}</h3>
          {film.subtitle && (
            <p className="text-zinc-300 italic">{film.subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// FILM CARD
// ============================================

interface FilmCardProps {
  film: Film;
  onPlay: (film: Film) => void;
  featured?: boolean;
}

function FilmCard({ film, onPlay, featured = false }: FilmCardProps) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-surface-secondary cursor-pointer',
        featured ? 'aspect-[16/9]' : 'aspect-video'
      )}
      onClick={() => onPlay(film)}
    >
      {/* Thumbnail */}
      <Image
        src={film.thumbnail}
        alt={film.title}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        unoptimized
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/30">
          <Play className="w-7 h-7 lg:w-8 lg:h-8 text-white fill-current ml-1" />
        </div>
      </div>

      {/* Distance badge */}
      {film.stats.distance && (
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm font-mono">
          {film.stats.distance}
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6">
        {/* Year & Location */}
        <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
          {film.year && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {film.year}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Mountain className="w-3.5 h-3.5" />
            {film.location}
          </span>
        </div>

        {/* Title */}
        <h3 className={cn(
          'font-display font-bold text-white mb-1',
          featured ? 'text-2xl lg:text-3xl' : 'text-lg'
        )}>
          {film.title}
        </h3>

        {/* Subtitle */}
        {film.subtitle && (
          <p className="text-zinc-300 text-sm italic mb-2">{film.subtitle}</p>
        )}

        {/* Description */}
        {featured && (
          <p className="text-zinc-400 text-sm line-clamp-2 max-w-2xl">
            {film.description}
          </p>
        )}

        {/* Stats */}
        {featured && (
          <div className="flex gap-6 mt-4">
            {film.stats.distance && (
              <div>
                <span className="font-mono text-lg font-bold text-orange-500 flex items-center gap-1">
                  <Route className="w-4 h-4" />
                  {film.stats.distance}
                </span>
                <span className="text-xs text-zinc-500 block">Distance</span>
              </div>
            )}
            {film.stats.elevation && (
              <div>
                <span className="font-mono text-lg font-bold text-orange-500 flex items-center gap-1">
                  <Mountain className="w-4 h-4" />
                  {film.stats.elevation}
                </span>
                <span className="text-xs text-zinc-500 block">Elevation</span>
              </div>
            )}
            {film.stats.time && (
              <div>
                <span className="font-mono text-lg font-bold text-orange-500 flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  {film.stats.time}
                </span>
                <span className="text-xs text-zinc-500 block">Time</span>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="aspect-video bg-surface-secondary rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

// ============================================
// FILMS PAGE
// ============================================

export default function FilmsPage() {
  const [films, setFilms] = useState<Film[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);

  // Fetch films from API
  useEffect(() => {
    async function fetchFilms() {
      try {
        const res = await fetch('/api/films');
        const data = await res.json();

        if (!data.ok) {
          throw new Error(data.error || 'Failed to load films');
        }

        setFilms(data.films);
      } catch (err) {
        console.error('Failed to fetch films:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFilms();
  }, []);

  // First film is featured
  const featuredFilm = films.length > 0 ? films[0] : null;
  const regularFilms = films.slice(1);

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 bg-background min-h-screen">
        {/* Hero section */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Ultra Race Films
              </h1>
              <p className="text-lg text-secondary">
                Documentary-style race films capturing the spirit of ultra running.
                From alpine adventures to British classics, these are my ultra marathon journeys.
              </p>
              {!isLoading && films.length > 0 && (
                <p className="text-sm text-muted mt-4">
                  {films.length} films from my ultra running adventures
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Loading state */}
        {isLoading && (
          <section className="py-12 lg:py-16">
            <div className="container">
              <LoadingSkeleton />
            </div>
          </section>
        )}

        {/* Error state */}
        {error && (
          <section className="py-12 lg:py-16">
            <div className="container">
              <div className="text-center py-16">
                <p className="text-muted">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 bg-brand text-white rounded-full hover:bg-brand-hover transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Featured film */}
        {!isLoading && !error && featuredFilm && (
          <section className="py-12 lg:py-16">
            <div className="container">
              <span className="text-brand text-sm font-semibold uppercase tracking-wider mb-4 block">
                Latest Film
              </span>
              <FilmCard
                film={featuredFilm}
                onPlay={setSelectedFilm}
                featured
              />
            </div>
          </section>
        )}

        {/* Films grid */}
        {!isLoading && !error && regularFilms.length > 0 && (
          <section className="py-12 lg:py-16">
            <div className="container">
              <h2 className="font-display text-2xl font-bold text-foreground mb-8">
                All Films
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularFilms.map((film) => (
                  <FilmCard
                    key={film.id}
                    film={film}
                    onPlay={setSelectedFilm}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && !error && films.length === 0 && (
          <section className="py-12 lg:py-16">
            <div className="container">
              <div className="text-center py-16">
                <p className="text-muted">No films available yet.</p>
              </div>
            </div>
          </section>
        )}

        {/* CTA section */}
        <section className="py-16 lg:py-24 border-t border-border">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Want Your Race Filmed?
              </h2>
              <p className="text-secondary mb-8">
                POV race footage, event coverage, or documentary projects.
                Let's capture your running story.
              </p>
              <Link
                href="/services"
                className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-full"
              >
                View Services
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedFilm}
        onClose={() => setSelectedFilm(null)}
        film={selectedFilm}
      />
    </>
  );
}
