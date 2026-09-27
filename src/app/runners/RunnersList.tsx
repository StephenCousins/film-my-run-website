'use client';
import Link from 'next/link';
import { useState } from 'react';
import { flagEmoji } from '@/lib/runners/flag';
import RunnerCard from '@/components/runners/RunnerCard';

interface Row { slug: string; name: string; nationality: string | null; disciplines: string[]; era: string; utmbIndex: number | null; photo: string | null }
const FILTERS: [string, string][] = [['all', 'All'], ['trail_ultra', 'Trail & Ultra'], ['road', 'Road'], ['track', 'Track']];

export default function RunnersList({ runners }: { runners: Row[] }) {
  const [q, setQ] = useState('');
  const [d, setD] = useState('all');
  const match = (r: Row) => (d === 'all' || r.disciplines.includes(d)) && r.name.toLowerCase().includes(q.trim().toLowerCase());
  const current = runners.filter((r) => r.era === 'current' && match(r));
  const legends = runners.filter((r) => r.era === 'historic' && match(r));
  const grid = (rows: Row[]) => (
    <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-6">
      {rows.map((r) => (
        <li key={r.slug}>
          <Link href={`/runners/${r.slug}`} className="block group">
            {r.photo
              ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo} alt="" className="w-full aspect-[4/5] object-cover rounded-xl" />
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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search runners" aria-label="Search runners" className="px-4 py-2 rounded-lg border border-border bg-background text-foreground w-full sm:w-64" />
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setD(k)} aria-pressed={d === k} className={`px-3 py-1.5 rounded-full text-sm border ${d === k ? 'bg-[#f88c00] border-[#f88c00] text-white' : 'border-border text-foreground'}`}>{label}</button>
        ))}
      </div>
      {current.length > 0 && grid(current)}
      {legends.length > 0 && (<><h2 className="font-display text-2xl font-bold text-foreground mt-12">Legends</h2>{grid(legends)}</>)}
      {current.length + legends.length === 0 && <p className="mt-8 text-secondary">No runners match.</p>}
    </>
  );
}
