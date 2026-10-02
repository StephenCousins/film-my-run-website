import Link from 'next/link';
import { GAME_NAME, londonDate, puzzleFor } from '@/lib/word-run/game';

/** Today's Fartlex on the homepage (Stephen, 2 Oct 2026): the day's length as empty tiles, and a way in. */
export default function FartlexStrip() {
  const p = puzzleFor(londonDate());
  return (
    <section className="py-10 px-4 bg-surface-secondary border-y border-border">
      <Link href="/games/fartlex" className="group max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Daily running word game</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-1">
            Today&apos;s {GAME_NAME} #{p.number}
          </h2>
          <p className="text-secondary mt-1">
            {p.length} letters{p.length === 7 ? ': long run Sunday' : ''}. Keep your run streak going.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: p.length }, (_, i) => (
              <span key={i} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md border-2 ${i === 0 ? 'bg-brand border-brand' : i === 2 ? 'bg-sky-600 border-sky-600' : 'border-zinc-400 dark:border-zinc-600'}`} />
            ))}
          </div>
          <span className="btn-primary whitespace-nowrap">Play</span>
        </div>
      </Link>
    </section>
  );
}
