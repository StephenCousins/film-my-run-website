import Link from 'next/link';
import { GAME_NAME, londonDate, puzzleFor } from '@/lib/word-run/game';
import { GAME_NAME as RUNGUESSR, puzzleNumber } from '@/lib/runguessr/game';

/**
 * Today's games on the homepage. Fartlex since 2 Oct 2026 (the day's length as tiles);
 * RunGuessr beside it since 11 Nov 2026 (a profile line). Both link straight into the game.
 */
export default function FartlexStrip() {
  const date = londonDate();
  const p = puzzleFor(date);
  return (
    <section className="py-10 px-4 bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Today&apos;s daily games</p>
          <Link href="/games" className="text-sm text-zinc-400 hover:text-white">All games →</Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/games/runguessr" className="group rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-5 flex items-center justify-between gap-4 transition-colors">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold">{RUNGUESSR} #{puzzleNumber(date)}</h2>
              <p className="text-zinc-400 text-sm mt-1">Five races. Can you name them from the course?</p>
            </div>
            <svg viewBox="0 0 100 40" className="w-24 h-10 shrink-0" aria-hidden>
              <polyline points="0,34 12,30 24,14 34,20 46,6 58,18 70,12 82,28 100,22" fill="none" stroke="#f88c00" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/games/fartlex" className="group rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-5 flex items-center justify-between gap-4 transition-colors">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold">{GAME_NAME} #{p.number}</h2>
              <p className="text-zinc-400 text-sm mt-1">{p.length} letters{p.length === 7 ? ': long run Sunday' : ''}. Keep your run streak going.</p>
            </div>
            <div className="flex gap-1 shrink-0" aria-hidden>
              {Array.from({ length: p.length }, (_, i) => (
                <span key={i} className={`w-4 h-4 sm:w-5 sm:h-5 rounded ${i === 0 ? 'bg-brand' : i === 2 ? 'bg-sky-600' : 'bg-zinc-700'}`} />
              ))}
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
