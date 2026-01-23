'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Film, Award, Play, ArrowRight, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// ============================================
// DOCUMENTARY DATA
// ============================================

const documentaries = [
  {
    id: 'R2fhcCSvZj8',
    title: '81 Yards',
    description: 'When John Stocker lined up for his backyard ultra attempt, nobody knew they were about to witness history. This film documents his extraordinary journey to 81 yards and a new world record.',
    award: 'Best Running Film - Sheffield Adventure Film Festival',
    featured: true,
  },
  {
    id: 'p6ReCqvcvz8',
    title: 'Sub 40',
    description: 'Can a masters athlete defy the clock? We follow Tim Grose through months of dedicated training as he chases one of running\'s magic numbers - the sub 40 minute 10k.',
    award: null,
    featured: false,
  },
  {
    id: 'sdA-qO1_MP8',
    title: 'Victoria\'s Marathon',
    description: 'From nervous beginner to marathon finisher. An intimate portrait of Victoria Cousins as she takes on 26.2 miles for the very first time.',
    award: null,
    featured: false,
  },
  {
    id: 'v8hYS6BWioo',
    title: 'The Road to 100',
    description: 'Through the streets of Paris, James Bennett reflects on a lifetime of running as he closes in on his hundredth marathon. Part race film, part autobiography.',
    award: null,
    featured: false,
  },
];

// ============================================
// VIDEO MODAL COMPONENT
// ============================================

function VideoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:text-orange-500 transition-colors"
      >
        <X className="w-8 h-8" />
      </button>
      <div
        className="relative w-full max-w-5xl aspect-video"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="Documentary"
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

// ============================================
// AWARD WREATH COMPONENT
// ============================================

function AwardWreath({ text }: { text: string }) {
  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="relative flex items-center justify-center">
        {/* Wreath SVG */}
        <svg
          viewBox="0 0 100 100"
          className="w-24 h-24 text-amber-500"
          fill="currentColor"
        >
          {/* Left laurel branch */}
          <path d="M25 85 Q20 70, 25 55 Q15 60, 20 45 Q10 48, 18 35 Q8 35, 18 25 Q10 22, 22 18 Q18 10, 30 15 Q30 5, 40 12 Q42 3, 50 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
          />
          {/* Left leaves */}
          <ellipse cx="22" cy="75" rx="6" ry="10" transform="rotate(-30 22 75)" opacity="0.9"/>
          <ellipse cx="18" cy="60" rx="5" ry="9" transform="rotate(-40 18 60)" opacity="0.9"/>
          <ellipse cx="15" cy="45" rx="5" ry="8" transform="rotate(-50 15 45)" opacity="0.9"/>
          <ellipse cx="15" cy="32" rx="4" ry="7" transform="rotate(-60 15 32)" opacity="0.9"/>
          <ellipse cx="20" cy="22" rx="4" ry="6" transform="rotate(-70 20 22)" opacity="0.9"/>
          <ellipse cx="28" cy="14" rx="4" ry="6" transform="rotate(-80 28 14)" opacity="0.9"/>
          <ellipse cx="40" cy="10" rx="4" ry="5" transform="rotate(-85 40 10)" opacity="0.9"/>

          {/* Right laurel branch */}
          <path d="M75 85 Q80 70, 75 55 Q85 60, 80 45 Q90 48, 82 35 Q92 35, 82 25 Q90 22, 78 18 Q82 10, 70 15 Q70 5, 60 12 Q58 3, 50 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
          />
          {/* Right leaves */}
          <ellipse cx="78" cy="75" rx="6" ry="10" transform="rotate(30 78 75)" opacity="0.9"/>
          <ellipse cx="82" cy="60" rx="5" ry="9" transform="rotate(40 82 60)" opacity="0.9"/>
          <ellipse cx="85" cy="45" rx="5" ry="8" transform="rotate(50 85 45)" opacity="0.9"/>
          <ellipse cx="85" cy="32" rx="4" ry="7" transform="rotate(60 85 32)" opacity="0.9"/>
          <ellipse cx="80" cy="22" rx="4" ry="6" transform="rotate(70 80 22)" opacity="0.9"/>
          <ellipse cx="72" cy="14" rx="4" ry="6" transform="rotate(80 72 14)" opacity="0.9"/>
          <ellipse cx="60" cy="10" rx="4" ry="5" transform="rotate(85 60 10)" opacity="0.9"/>
        </svg>
        {/* Award icon in center */}
        <Award className="absolute w-8 h-8 text-amber-400" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -30%)' }} />
      </div>
      <p className="text-center text-xs text-amber-400 font-semibold mt-1 max-w-[120px] leading-tight">
        {text}
      </p>
    </div>
  );
}

// ============================================
// DOCUMENTARY CARD COMPONENT
// ============================================

function DocumentaryCard({
  doc,
  onPlay
}: {
  doc: typeof documentaries[0];
  onPlay: () => void;
}) {
  return (
    <div className={`group relative ${doc.featured ? 'md:col-span-2' : ''}`}>
      {/* Thumbnail */}
      <div
        className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer"
        onClick={onPlay}
      >
        <img
          src={`https://img.youtube.com/vi/${doc.id}/hqdefault.jpg`}
          alt={doc.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Award Wreath */}
        {doc.award && <AwardWreath text={doc.award} />}

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-orange-500/90 flex items-center justify-center transform group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="font-display text-xl lg:text-2xl font-bold text-white mb-2">
            {doc.title}
          </h3>
          <p className="text-zinc-300 text-sm line-clamp-2">
            {doc.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function DocumentaryFilmsPage() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24 bg-zinc-950 min-h-screen">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Background - use featured video thumbnail */}
          <div className="absolute inset-0">
            <img
              src={`https://img.youtube.com/vi/${documentaries[0].id}/hqdefault.jpg`}
              alt="Documentary background"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/70 to-zinc-950" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full border border-orange-500/30 mb-6">
                <Film className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400 text-sm font-medium">Documentary Films</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Award-Winning Running Documentaries
              </h1>

              <p className="text-lg text-zinc-300 max-w-2xl mx-auto">
                Telling the stories that matter. From the mountains of Mont Blanc and UTMB to
                the rolling hills of the South Downs in the UK, award winning personal journeys
                of ultra runners. Films that capture the heart of our sport.
              </p>
            </div>
          </div>
        </section>

        {/* Documentaries Grid */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="grid gap-8 md:grid-cols-2">
              {documentaries.map((doc) => (
                <DocumentaryCard
                  key={doc.id}
                  doc={doc}
                  onPlay={() => setActiveVideo(doc.id)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Commission CTA */}
        <section className="py-16 lg:py-24 border-t border-zinc-800">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
                Commission Your Own Documentary
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Have a story to tell? Whether it's a race, an athlete profile, or a running community,
                I'd love to help bring your vision to life.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact?service=documentary"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors"
                >
                  Get in Touch
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-zinc-800 text-white font-semibold rounded-full hover:bg-zinc-700 transition-colors"
                >
                  View All Services
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Video Modal */}
      {activeVideo && (
        <VideoModal
          videoId={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </>
  );
}
