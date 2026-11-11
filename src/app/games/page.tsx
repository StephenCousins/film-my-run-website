import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GameHero from '@/components/games/GameHero';
import { GAME_NAME as FARTLEX, londonDate, puzzleFor } from '@/lib/word-run/game';
import { GAME_NAME as RUNGUESSR, puzzleNumber } from '@/lib/runguessr/game';

// Both games show today's number, which changes at midnight London time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily running games',
  description: 'Two free daily games for runners: RunGuessr, guess the race from its course, and Fartlex, the running word game.',
  alternates: { canonical: 'https://filmmyrun.com/games' },
};

export default function GamesPage() {
  const date = londonDate();
  const word = puzzleFor(date);
  const games = [
    {
      href: '/games/runguessr', name: RUNGUESSR, number: puzzleNumber(date), tag: 'Guess the race',
      blurb: 'A photo, an elevation profile or a course map. Five races a day, from Western States to the Great North Run.',
      art: (
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="w-full h-16" aria-hidden>
          <polygon points="0,60 0,48 20,44 40,22 55,30 75,12 95,26 115,18 135,40 160,30 180,46 200,40 200,60" fill="#f88c00" fillOpacity="0.2" />
          <polyline points="0,48 20,44 40,22 55,30 75,12 95,26 115,18 135,40 160,30 180,46 200,40" fill="none" stroke="#f88c00" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      href: '/games/fartlex', name: FARTLEX, number: word.number, tag: 'Running word',
      blurb: `A new running word every day. ${word.length} letters today, building to a seven-letter long run on Sunday.`,
      art: (
        <div className="flex gap-1.5 h-16 items-center" aria-hidden>
          {Array.from({ length: word.length }, (_, i) => (
            <span key={i} className={`w-9 h-9 rounded-md ${i === 0 ? 'bg-brand' : i === 2 ? 'bg-sky-600' : 'bg-zinc-700'}`} />
          ))}
        </div>
      ),
    },
  ];
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pb-16">
        <GameHero eyebrow="Film My Run" title="Daily games" subtitle="A new puzzle every day at midnight UK time. Keep your streak going." />
        <div className="relative -mt-16 max-w-3xl mx-auto px-4 grid sm:grid-cols-2 gap-4">
          {games.map((g) => (
            <Link key={g.href} href={g.href} className="card-interactive shadow-xl shadow-black/10 p-6 flex flex-col group">
              {g.art}
              <p className="text-xs font-semibold uppercase tracking-widest text-brand mt-4">{g.tag} · #{g.number}</p>
              <h2 className="font-display text-3xl font-bold text-foreground mt-1">{g.name}</h2>
              <p className="text-secondary mt-2 flex-1">{g.blurb}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-brand">Play today&apos;s <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
