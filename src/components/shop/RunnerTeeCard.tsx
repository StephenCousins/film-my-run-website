import Link from 'next/link';
import { typeById } from '@/lib/runner-quiz';
import { SHIRT_COLOURS, frontArt, teeMock } from '@/lib/runner-quiz/shirt-art';
import { runnerTee } from '@/lib/shop/runner-tee';
import { formatPrice } from '@/lib/shop';
import '@/styles/runner-quiz-fonts.css';

const fell = typeById('fell')!;
const fellColour = fell.shirtColour as keyof typeof SHIRT_COLOURS;
const preview = teeMock(SHIRT_COLOURS[fellColour], frontArt(fell, fellColour));

/**
 * The Runner Type Tee as a card in the shop grid. It has no page of its own without a quiz
 * result (the website keeps none), so it goes to the quiz.
 */
export default function RunnerTeeCard() {
  return (
    <Link
      href="/tools/runner-quiz"
      className="group block rounded-2xl bg-surface-secondary border border-border overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
    >
      <div className="relative aspect-square bg-zinc-100 overflow-hidden flex items-center justify-center pt-9">
        <div className="w-[80%] [&>svg]:w-full [&>svg]:h-auto" aria-hidden dangerouslySetInnerHTML={{ __html: preview }} />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-brand text-[11px] font-semibold uppercase tracking-wider text-black">
          Personalised
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-brand transition-colors">
          {runnerTee.name}: take the quiz
        </h3>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-sm text-foreground">{formatPrice(runnerTee)}</span>
          <span className="flex items-center gap-1" aria-label={`${runnerTee.colours.length} colours`}>
            {runnerTee.colours.map((c) => (
              <span key={c} title={c} className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: SHIRT_COLOURS[c as keyof typeof SHIRT_COLOURS] }} />
            ))}
          </span>
        </div>
      </div>
    </Link>
  );
}
