'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { flagEmoji } from '@/lib/runners/flag';
import RunnerCard from '@/components/runners/RunnerCard';

interface Row { slug: string; name: string; nationality: string | null; disciplines: string[]; era: string; utmbIndex: number | null; photo: string | null }
const FILTERS: [string, string][] = [['all', 'All'], ['trail_ultra', 'Trail & Ultra'], ['road', 'Road'], ['track', 'Track'], ['legends', 'Legends']];
// Cards per batch: every runner is still in the search and filters, and on its own sitemap page.
const PAGE = 48;

export default function RunnersList({ runners }: { runners: Row[] }) {
  const [q, setQ] = useState('');
  const [d, setD] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const match = (r: Row) => (d === 'all' || d === 'legends' || r.disciplines.includes(d)) && r.name.toLowerCase().includes(q.trim().toLowerCase());
  const current = d === 'legends' ? [] : runners.filter((r) => r.era === 'current' && match(r));
  const legends = runners.filter((r) => r.era === 'historic' && match(r));
  // One "Show more" for the page: current runners first, then the legends.
  const currentShown = current.slice(0, shown);
  const legendsShown = legends.slice(0, Math.max(0, shown - current.length));
  const remaining = current.length + legends.length - currentShown.length - legendsShown.length;
  const filterBy = (k: string) => { setD(k); setShown(PAGE); };
  const grid = (rows: Row[]) => (
    <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-6">
      {rows.map((r) => (
        <li key={r.slug}>
          <Link href={`/runners/${r.slug}`} className="block group">
            {r.photo
              ? (
                <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                  <Image
                    src={r.photo}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover object-top"
                  />
                </div>
              )
              : <RunnerCard name={r.name} flag={flagEmoji(r.nationality)} index={r.utmbIndex} className="aspect-[4/5] w-full rounded-xl" />}
            <span className="block mt-2 font-semibold text-foreground group-hover:text-[#f88c00]">{flagEmoji(r.nationality)} {r.name}</span>
            {r.utmbIndex !== null && <span className="block text-sm text-secondary tabular-nums">UTMB Index {r.utmbIndex}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3 items-center">
        <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search runners" aria-label="Search runners" className="px-4 py-2 rounded-lg border border-border bg-background text-foreground w-full sm:w-64" />
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => filterBy(k)} aria-pressed={d === k} className={`px-3 py-1.5 rounded-full text-sm border ${d === k ? 'bg-[#f88c00] border-[#f88c00] text-white' : 'border-border text-foreground'}`}>{label}</button>
        ))}
      </div>
      {currentShown.length > 0 && grid(currentShown)}
      {legendsShown.length > 0 && (<>{d !== 'legends' && <h2 className="font-display text-2xl font-bold text-foreground mt-12">Legends</h2>}{grid(legendsShown)}</>)}
      {current.length + legends.length === 0 && <p className="mt-8 text-secondary">No runners match.</p>}
      {remaining > 0 && (
        <div className="mt-10 text-center">
          <button onClick={() => setShown(shown + PAGE)} className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:border-[#f88c00]">
            Show more <span className="text-secondary tabular-nums">({remaining} left)</span>
          </button>
        </div>
      )}
    </>
  );
}
