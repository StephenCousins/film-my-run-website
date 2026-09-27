import { initials } from '@/lib/runners/initials';

/** Branded placeholder tile shown wherever a runner has no photo. Plain and
 * server-safe (no Prisma import) so both the server-rendered runner page and
 * the client-rendered runners list can use it. `className` carries the
 * aspect ratio and sizing, which differ between the two call sites. */
export default function RunnerCard({ name, flag, index, className = '' }: { name: string; flag: string; index: number | null; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#f88c00] text-white flex flex-col ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #e07800 0px, #e07800 3px, transparent 3px, transparent 22px)' }}
      />
      <div className="relative flex flex-1 items-center justify-center px-4 text-center">
        <span className="font-display font-bold text-5xl md:text-6xl leading-none">{initials(name)}</span>
      </div>
      <div className="relative flex items-end justify-between gap-2 px-4 pb-3">
        <div className="flex flex-col items-start">
          {flag && <span className="text-2xl leading-none">{flag}</span>}
          {index !== null && <span className="mt-1 text-xs text-white/85 tabular-nums">UTMB Index {index}</span>}
        </div>
        <span className="font-display text-[10px] tracking-wide text-white/70">Film My Run</span>
      </div>
    </div>
  );
}
