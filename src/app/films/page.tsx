'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Clock, Calendar, Mountain, Trophy, X, Filter } from 'lucide-react';
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
  duration: string;
  year: string;
  location: string;
  category: 'ultra' | 'marathon' | 'trail' | 'documentary' | 'parkrun';
  featured?: boolean;
  awards?: string[];
  stats?: {
    distance?: string;
    elevation?: string;
    finishers?: string;
  };
}

// ============================================
// FILMS DATA
// ============================================

const films: Film[] = [
  {
    id: 'tds-2022',
    title: 'TDS 2022',
    subtitle: 'Sur les Traces des Ducs de Savoie',
    description: 'Follow the journey through 145km of the most breathtaking alpine terrain. From the peaks of Chamonix to the finish in Courmayeur, this is trail running at its most epic.',
    thumbnail: '/images/films/tds-thumbnail.jpg',
    videoId: 'dQw4w9WgXcQ',
    duration: '42:18',
    year: '2022',
    location: 'Alps, France/Italy',
    category: 'ultra',
    featured: true,
    awards: ['Best Running Film - Sheffield Adventure Film Festival'],
    stats: {
      distance: '145km',
      elevation: '9,100m',
      finishers: '1,847',
    },
  },
  {
    id: 'utmb-2023',
    title: 'UTMB 2023',
    subtitle: 'Ultra-Trail du Mont-Blanc',
    description: 'The ultimate test of endurance. 171km around Mont Blanc, through France, Italy, and Switzerland.',
    thumbnail: '/images/films/utmb.jpg',
    videoId: 'dQw4w9WgXcQ',
    duration: '55:24',
    year: '2023',
    location: 'Alps, France/Italy/Switzerland',
    category: 'ultra',
    stats: {
      distance: '171km',
      elevation: '10,000m',
    },
  },
  {
    id: 'london-2024',
    title: 'London Marathon 2024',
    subtitle: 'Sub-3 Journey',
    description: 'A personal documentary of finally breaking the 3-hour barrier at the London Marathon after years of trying.',
    thumbnail: '/images/films/london-marathon.jpg',
    videoId: 'dQw4w9WgXcQ',
    duration: '28:45',
    year: '2024',
    location: 'London, UK',
    category: 'marathon',
    stats: {
      distance: '42.2km',
    },
  },
  {
    id: 'lakeland-100',
    title: 'Lakeland 100',
    subtitle: '100 Miles Through the Lakes',
    description: 'One of the toughest 100-mile races in the UK, circumnavigating the Lake District in under 40 hours.',
    thumbnail: '/images/films/lakeland.jpg',
    videoId: 'dQw4w9WgXcQ',
    duration: '48:30',
    year: '2023',
    location: 'Lake District, UK',
    category: 'ultra',
    stats: {
      distance: '105 miles',
      elevation: '6,500m',
    },
  },
  {
    id: 'parkrun-story',
    title: 'The Parkrun Story',
    subtitle: '297 Runs and Counting',
    description: 'A celebration of the parkrun community and how these 5k events have changed running culture.',
    thumbnail: '/images/films/parkrun.png',
    videoId: 'dQw4w9WgXcQ',
    duration: '22:15',
    year: '2024',
    location: 'Various, UK',
    category: 'parkrun',
  },
  {
    id: 'spine-race',
    title: 'The Spine Race',
    subtitle: 'Britain\'s Most Brutal Race',
    description: '268 miles along the Pennine Way in the depths of winter. This is as hard as it gets.',
    thumbnail: '/images/films/spine.jpg',
    videoId: 'dQw4w9WgXcQ',
    duration: '62:00',
    year: '2023',
    location: 'Pennines, UK',
    category: 'ultra',
    stats: {
      distance: '268 miles',
      elevation: '12,000m',
    },
  },
];

const categories = [
  { value: 'all', label: 'All Films' },
  { value: 'ultra', label: 'Ultra Marathons' },
  { value: 'marathon', label: 'Marathons' },
  { value: 'trail', label: 'Trail Running' },
  { value: 'documentary', label: 'Documentaries' },
  { value: 'parkrun', label: 'Parkrun' },
];

// ============================================
// VIDEO MODAL
// ============================================

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  film: Film | null;
}

function VideoModal({ isOpen, onClose, film }: VideoModalProps) {
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
            <p className="text-zinc-400 italic">{film.subtitle}</p>
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
        'group relative overflow-hidden rounded-2xl bg-zinc-900 cursor-pointer',
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
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/30">
          <Play className="w-7 h-7 lg:w-8 lg:h-8 text-white fill-current ml-1" />
        </div>
      </div>

      {/* Duration badge */}
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm font-mono">
        {film.duration}
      </div>

      {/* Award badge */}
      {film.awards && film.awards.length > 0 && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-orange-500 rounded-lg text-white text-xs font-semibold">
          <Trophy className="w-3.5 h-3.5" />
          Award Winner
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6">
        {/* Year & Location */}
        <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {film.year}
          </span>
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
        {featured && film.stats && (
          <div className="flex gap-6 mt-4">
            {film.stats.distance && (
              <div>
                <span className="font-mono text-lg font-bold text-orange-500">{film.stats.distance}</span>
                <span className="text-xs text-zinc-500 block">Distance</span>
              </div>
            )}
            {film.stats.elevation && (
              <div>
                <span className="font-mono text-lg font-bold text-orange-500">{film.stats.elevation}</span>
                <span className="text-xs text-zinc-500 block">Elevation</span>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================
// FILMS PAGE
// ============================================

export default function FilmsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);

  const filteredFilms = activeCategory === 'all'
    ? films
    : films.filter(film => film.category === activeCategory);

  const featuredFilm = films.find(f => f.featured);
  const regularFilms = filteredFilms.filter(f => !f.featured);

  return (
    <>
      <Header />

      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero section */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Films
              </h1>
              <p className="text-lg text-zinc-400">
                Documentary-style race films capturing the spirit of running. From
                alpine ultras to personal marathon journeys.
              </p>
            </div>
          </div>
        </section>

        {/* Featured film */}
        {featuredFilm && activeCategory === 'all' && (
          <section className="py-12 lg:py-16">
            <div className="container">
              <span className="text-orange-500 text-sm font-semibold uppercase tracking-wider mb-4 block">
                Featured Film
              </span>
              <FilmCard
                film={featuredFilm}
                onPlay={setSelectedFilm}
                featured
              />
            </div>
          </section>
        )}

        {/* Filter */}
        <section className="py-6 border-b border-zinc-800 sticky top-16 lg:top-20 z-30 bg-zinc-950">
          <div className="container">
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
              <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                    activeCategory === cat.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Films grid */}
        <section className="py-12 lg:py-16">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeCategory === 'all' ? regularFilms : filteredFilms).map((film) => (
                <FilmCard
                  key={film.id}
                  film={film}
                  onPlay={setSelectedFilm}
                />
              ))}
            </div>

            {filteredFilms.length === 0 && (
              <div className="text-center py-16">
                <p className="text-zinc-500">No films found in this category.</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA section */}
        <section className="py-16 lg:py-24 border-t border-zinc-800">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
                Want Your Race Filmed?
              </h2>
              <p className="text-zinc-400 mb-8">
                Personal race films, event coverage, or documentary projects.
                Let's capture your running story.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
              >
                Get in Touch
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
