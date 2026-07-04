'use client';

import { useState } from 'react';
import {
  Gem,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Trophy,
  ArrowLeft,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ---- Types (mirror the API) ------------------------------------------------

interface RunnerMatch {
  id: number;
  fullname: string;
  nationality: string;
  ageGroup: string;
  sex: string;
  index: number | null;
  uri: string;
}

interface EarnedRace {
  dateIso: string;
  eventName: string;
  raceName: string;
  category: string;
  stones: number;
  isMajor: boolean;
  majorLabel?: string;
  spent: boolean;
}

interface StoneResult {
  earnedRaces: EarnedRace[];
  earnedTotal: number;
  finals: { dateIso: string; raceName: string; eventName: string }[];
  lastFinalDate: string | null;
  availableFromHistory: number;
  active: boolean;
  mostRecentEarningDate: string | null;
  generalIndex: number | null;
  hasValidIndex: boolean;
  lotteryEligibleFromHistory: boolean;
}

interface RunnerData {
  runner: { fullname: string; nationalityCode: string; ageGroup: string; gender: string };
  indexes: { piCategory: string; index: number | null }[];
  stones: StoneResult;
}

// ---- Helpers ---------------------------------------------------------------

function flag(code: string): string {
  if (!code || code.length !== 2) return '🏳️';
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  );
}

function sexLabel(s: string): string {
  return s === 'H' ? 'Men' : s === 'F' ? 'Women' : '';
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

const CATEGORY_ORDER = ['general', '20k', '50k', '100k', '100m'];
const CATEGORY_LABEL: Record<string, string> = {
  general: 'General',
  '20k': '20K',
  '50k': '50K',
  '100k': '100K',
  '100m': '100M',
};

// ---- Page ------------------------------------------------------------------

export default function StoneTrackerPage() {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<RunnerMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<RunnerData | null>(null);
  const [loadingRunner, setLoadingRunner] = useState(false);
  const [error, setError] = useState('');
  const [upcomingFinal, setUpcomingFinal] = useState(false);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    const name = query.trim();
    if (name.length < 2) return;
    setSearching(true);
    setError('');
    setMatches(null);
    setData(null);
    try {
      const res = await fetch(`/api/stone-tracker/search?name=${encodeURIComponent(name)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Search failed');
      setMatches(body.runners || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSearching(false);
    }
  }

  async function selectRunner(m: RunnerMatch) {
    setLoadingRunner(true);
    setError('');
    setData(null);
    setUpcomingFinal(false);
    try {
      const res = await fetch(`/api/stone-tracker/runner?uri=${encodeURIComponent(m.uri)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not load runner');
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoadingRunner(false);
    }
  }

  function reset() {
    setData(null);
    setMatches(null);
    setError('');
    setQuery('');
  }

  const stones = data?.stones;
  const available = stones ? (upcomingFinal ? 0 : stones.availableFromHistory) : 0;
  const eligible = stones ? !upcomingFinal && stones.lotteryEligibleFromHistory : false;

  return (
    <>
      <Header />
      <main className="pt-20 lg:pt-24">
        {/* Hero */}
        <section className="relative py-12 lg:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-purple-500/10" />
          <div className="container relative">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full mb-5">
                <Gem className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">StoneTracker</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                How many <span className="text-orange-500">UTMB Running Stones</span> do you have?
              </h1>
              <p className="text-lg text-secondary">
                Search your name, pick your profile, and StoneTracker works out your stones from
                your UTMB race history — plus whether your UTMB Index is valid for the lottery.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="container">
            <div className="max-w-2xl">
              {/* Search */}
              <form onSubmit={doSearch} className="flex gap-3 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Your name, e.g. Stephen Cousins"
                    className="w-full pl-12 pr-4 py-3 bg-surface-tertiary border border-border rounded-full text-foreground placeholder:text-muted focus:outline-none focus:border-orange-500 transition-colors"
                    aria-label="Runner name"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || query.trim().length < 2}
                  className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                </button>
              </form>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {/* Matches — disambiguation */}
              {matches && !data && !loadingRunner && (
                <div>
                  {matches.length === 0 ? (
                    <p className="text-secondary">
                      No runners found. Check the spelling, or try just your surname.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-muted mb-3">
                        {matches.length === 1 ? 'Is this you?' : 'Which one is you?'}
                      </p>
                      <div className="space-y-2">
                        {matches.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => selectRunner(m)}
                            className="w-full flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:border-orange-500/60 transition-colors text-left group"
                          >
                            <span className="text-2xl" aria-hidden>
                              {flag(m.nationality)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-foreground truncate">
                                {m.fullname}
                              </div>
                              <div className="text-sm text-muted">
                                {[m.nationality, m.ageGroup, sexLabel(m.sex)]
                                  .filter(Boolean)
                                  .join(' · ')}
                                {m.index != null && ` · Index ${m.index}`}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted group-hover:text-orange-500 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {loadingRunner && (
                <div className="flex items-center gap-3 text-secondary">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  Reading UTMB race history…
                </div>
              )}

              {/* Result */}
              {data && stones && (
                <div className="space-y-6">
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    New search
                  </button>

                  {/* Headline stones */}
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 lg:p-8">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 text-sm text-muted mb-2">
                        <span className="text-xl">{flag(data.runner.nationalityCode)}</span>
                        <span>
                          {data.runner.fullname} · {data.runner.ageGroup}
                        </span>
                      </div>
                      <div className="flex items-end gap-3">
                        <Gem className="w-10 h-10 text-orange-500 mb-2" />
                        <span className="font-mono text-6xl font-bold text-orange-500 leading-none">
                          {available}
                        </span>
                        <span className="text-lg text-secondary mb-1">
                          running stone{available === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-secondary mt-3">
                        {available > 0
                          ? stones.active
                            ? 'Available now for the UTMB Mont-Blanc lottery.'
                            : 'These are frozen — run any UTMB World Series event to reactivate them.'
                          : 'No stones available. Finish a UTMB World Series event (20K–100M) to earn some.'}
                      </p>

                      {/* Lottery eligibility */}
                      <div className="mt-5 flex flex-wrap gap-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                            eligible
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-surface-tertiary text-muted'
                          )}
                        >
                          {eligible ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {eligible ? 'Lottery-eligible' : 'Not lottery-eligible yet'}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                            stones.hasValidIndex
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-red-500/10 text-red-500'
                          )}
                        >
                          {stones.hasValidIndex ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {stones.hasValidIndex
                            ? `Valid UTMB Index (${stones.generalIndex})`
                            : 'No valid UTMB Index'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Upcoming finals toggle */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={upcomingFinal}
                      onChange={(e) => setUpcomingFinal(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-foreground">
                        I&apos;m registered for an upcoming Finals race (OCC / CCC / UTMB) I
                        haven&apos;t run yet.
                      </span>
                      <span className="block text-muted mt-1">
                        Being accepted into a Finals race spends all your stones — and that
                        registration isn&apos;t public, so we can only account for it if you tell us.
                        {upcomingFinal && ' Your balance is therefore 0.'}
                      </span>
                    </span>
                  </label>

                  {/* Earned breakdown */}
                  <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h2 className="font-display font-semibold text-foreground">
                        Stones earned ({stones.earnedTotal} all-time)
                      </h2>
                    </div>
                    {stones.earnedRaces.length === 0 ? (
                      <p className="p-4 text-sm text-muted">
                        No stone-earning UTMB World Series finishes found.
                      </p>
                    ) : (
                      <ul>
                        {stones.earnedRaces.map((e, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-3 p-4 border-b border-border last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {e.eventName}{' '}
                                <span className="text-muted font-normal">· {e.raceName}</span>
                              </div>
                              <div className="text-sm text-muted">
                                {fmtDate(e.dateIso)} · {CATEGORY_LABEL[e.category] || e.category}
                                {e.isMajor && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-orange-500">
                                    <Trophy className="w-3 h-3" /> Major ×2
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-foreground">
                                +{e.stones}
                              </div>
                              <div
                                className={cn(
                                  'text-xs',
                                  e.spent ? 'text-muted' : 'text-green-600 dark:text-green-400'
                                )}
                              >
                                {e.spent ? 'spent' : 'available'}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Spent at finals */}
                  {stones.finals.length > 0 && (
                    <div className="rounded-2xl border border-border bg-surface p-4">
                      <h2 className="font-display font-semibold text-foreground mb-2">
                        Stones spent entering the Finals
                      </h2>
                      <p className="text-sm text-muted mb-3">
                        Each successful Finals lottery entry uses all your stones at that point.
                      </p>
                      <ul className="space-y-1">
                        {stones.finals.map((f, i) => (
                          <li key={i} className="text-sm text-secondary flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-muted flex-shrink-0" />
                            {f.raceName} · {fmtDate(f.dateIso)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Performance index breakdown */}
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <h2 className="font-display font-semibold text-foreground mb-3">
                      UTMB Performance Index
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_ORDER.map((cat) => {
                        const idx = data.indexes.find((p) => p.piCategory === cat);
                        const val = idx ? idx.index : null;
                        return (
                          <span
                            key={cat}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border',
                              val != null
                                ? 'bg-surface-tertiary border-border text-foreground'
                                : 'border-border text-muted'
                            )}
                          >
                            <span className="font-medium">{CATEGORY_LABEL[cat] || cat}</span>
                            <span className="font-mono">{val != null ? val : '—'}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* How this is worked out */}
                  <div className="rounded-2xl border border-border bg-surface-secondary p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-secondary space-y-2">
                        <p>
                          Stones are computed from your public UTMB race history: you earn them by
                          finishing UTMB World Series events (20K = 1, 50K = 2, 100K = 3, 100M = 4;
                          doubled at Majors), and each successful Finals entry (OCC/CCC/UTMB) uses
                          them all up.
                        </p>
                        <p className="text-muted">
                          We can&apos;t see your private MyUTMB balance or your upcoming
                          registrations, so this is our best reconstruction. Your official balance
                          lives in your MyUTMB account.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
