import Link from 'next/link';
import { GAME_NAME as FARTLEX, londonDate, puzzleFor } from '@/lib/word-run/game';
import { GAME_NAME as RUNGUESSR, puzzleNumber } from '@/lib/runguessr/game';

/** Sidebar card on blog posts and news stories (Nov 2026): today's two games, in the games' own dark look. */
export default function DailyGamesCard() {
  const date = londonDate();
  const word = puzzleFor(date);
  const games = [
    { href: '/games/runguessr', name: RUNGUESSR, number: puzzleNumber(date), line: 'Name five races from their courses' },
    { href: '/games/fartlex', name: FARTLEX, number: word.number, line: `Today's running word: ${word.length} letters` },
  ];
  return (
    <div className="rounded-2xl bg-zinc-950 text-white p-5 overflow-hidden relative">
      <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-12 opacity-40" aria-hidden>
        <polyline points="0,34 20,30 40,16 55,22 75,6 95,20 115,12 135,28 160,20 180,32 200,26" fill="none" stroke="#f88c00" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Today&apos;s daily games</p>
      <div className="relative mt-3 space-y-2">
        {games.map((g) => (
          <Link key={g.href} href={g.href} className="group flex items-center justify-between gap-3 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2.5 transition-colors">
            <span className="min-w-0">
              <span className="block font-display font-bold">{g.name} <span className="text-zinc-500 font-normal">#{g.number}</span></span>
              <span className="block text-xs text-zinc-400">{g.line}</span>
            </span>
            <span className="text-brand text-sm font-semibold group-hover:translate-x-0.5 transition-transform">Play →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
