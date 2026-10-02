'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Delete, Share2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { GAME_NAME, score, shareText, type Mark } from '@/lib/word-run/game';
import { EMPTY_STATS, liveStreak, record, type Stats } from '@/lib/word-run/stats';

interface Props {
  puzzle: { number: number; length: number; maxGuesses: number; word: string; fact: string; link: { label: string; href: string } | null };
}

/** Today's guesses, and the player's record, live in this browser only. */
const KEY = 'wordrun:v1';
interface Saved { day: number; guesses: string[]; stats: Stats }

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
function save(s: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: the game still works, it just forgets */ }
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const TILE: Record<Mark | 'empty' | 'typed', string> = {
  correct: 'bg-brand border-brand text-white',
  present: 'bg-sky-600 border-sky-600 text-white',
  absent: 'bg-zinc-500 border-zinc-500 text-white dark:bg-zinc-700 dark:border-zinc-700',
  typed: 'border-zinc-500 dark:border-zinc-400 text-foreground',
  empty: 'border-border text-foreground',
};
const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };

/** Time until midnight in London, when the next word arrives. */
function untilNext(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const left = 86_400 - (get('hour') * 3600 + get('minute') * 60 + get('second'));
  return `${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m`;
}

export default function WordRunClient({ puzzle }: Props) {
  const { number, length, maxGuesses, word } = puzzle;
  const [guesses, setGuesses] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [current, setCurrent] = useState('');
  const [valid, setValid] = useState<Set<string> | null>(null);
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState('');

  // Restore today's game and the player's record after mount (localStorage isn't there on the server).
  useEffect(() => {
    const s = load();
    if (s) {
      setStats(s.stats);
      if (s.day === number) setGuesses(s.guesses);
    }
  }, [number]);

  useEffect(() => {
    fetch(`/games/word-run/words-${length}.txt`)
      .then((r) => r.text())
      .then((t) => setValid(new Set(t.split('\n').map((w) => w.trim().toUpperCase()))))
      .catch(() => setValid(new Set())); // offline: accept any word rather than lock the player out
  }, [length]);

  const won = guesses.includes(word);
  const done = won || guesses.length >= maxGuesses;
  const rows = useMemo(() => guesses.map((g) => score(g, word)), [guesses, word]);

  useEffect(() => {
    if (!done) return;
    setCountdown(untilNext());
    const t = setInterval(() => setCountdown(untilNext()), 30_000);
    return () => clearInterval(t);
  }, [done]);

  const keyMarks = useMemo(() => {
    const m = new Map<string, Mark>();
    guesses.forEach((g, i) => [...g].forEach((ch, j) => {
      const mark = rows[i][j];
      if (!m.has(ch) || RANK[mark] > RANK[m.get(ch)!]) m.set(ch, mark);
    }));
    return m;
  }, [guesses, rows]);

  const flash = (text: string) => {
    setMessage(text);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => setMessage(''), 1800);
  };

  const submit = useCallback(() => {
    if (current.length !== length) return flash(`${length} letters needed`);
    if (valid && valid.size > 0 && !valid.has(current) && current !== word) return flash('Not in the word list');
    const next = [...guesses, current];
    const finished = current === word || next.length >= maxGuesses;
    const nextStats = finished ? record(stats, number, current === word, next.length) : stats;
    setGuesses(next);
    setStats(nextStats);
    setCurrent('');
    save({ day: number, guesses: next, stats: nextStats });
  }, [current, length, valid, word, guesses, maxGuesses, stats, number]);

  const press = useCallback((key: string) => {
    if (done) return;
    if (key === 'ENTER') return submit();
    if (key === 'BACKSPACE') return setCurrent((c) => c.slice(0, -1));
    if (/^[A-Z]$/.test(key)) setCurrent((c) => (c.length < length ? c + key : c));
  }, [done, submit, length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      press(e.key.toUpperCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const share = async () => {
    const text = shareText({ number, maxGuesses, won, rows });
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setMessage('Copied. Paste it anywhere.'); setTimeout(() => setMessage(''), 1800); }
    } catch { /* the player closed the share sheet */ }
  };

  const tile = length >= 7 ? 'w-10 h-10 text-lg sm:w-12 sm:h-12 sm:text-xl' : 'w-12 h-12 text-xl sm:w-14 sm:h-14 sm:text-2xl';
  const streak = liveStreak(stats, number);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-16 px-4">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Daily running word</p>
          <h1 className="font-display text-3xl font-bold text-foreground mt-1">{GAME_NAME} #{number}</h1>
          <p className="text-secondary text-sm mt-1">
            {length} letters, {maxGuesses} guesses{streak > 0 ? ` · Run streak ${streak}` : ''}
          </p>

          <div className="h-8 mt-3 text-sm font-medium text-foreground" role="status" aria-live="polite">{message}</div>

          <div className="grid gap-1.5 mb-6" style={{ gridTemplateRows: `repeat(${maxGuesses}, auto)` }}>
            {Array.from({ length: maxGuesses }, (_, r) => {
              const g = r < guesses.length ? guesses[r] : r === guesses.length ? current : '';
              const marks = r < guesses.length ? rows[r] : null;
              return (
                <div key={r} className={`flex gap-1.5 ${shake && r === guesses.length ? 'animate-[wordrun-shake_0.4s]' : ''}`}>
                  {Array.from({ length }, (_, c) => {
                    const ch = g[c] ?? '';
                    const kind = marks ? marks[c] : ch ? 'typed' : 'empty';
                    return (
                      <div key={c} className={`${tile} border-2 rounded-md flex items-center justify-center font-bold uppercase ${TILE[kind]}`} aria-label={ch ? `${ch}${marks ? `, ${marks[c]}` : ''}` : 'empty'}>
                        {ch}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {done ? (
            <section className="card w-full p-6 text-center">
              <p className="text-sm text-secondary">{won ? `Solved in ${guesses.length}` : 'Out of guesses. The word was'}</p>
              <p className="font-display text-3xl font-bold tracking-widest text-brand mt-1">{word}</p>
              <p className="text-foreground mt-4 leading-relaxed">{puzzle.fact}</p>
              {puzzle.link && (
                <Link href={puzzle.link.href} className="inline-block mt-3 text-sm font-semibold text-brand hover:underline">{puzzle.link.label} →</Link>
              )}
              <div className="grid grid-cols-4 gap-2 mt-6 text-center">
                {[['Played', stats.played], ['Won', stats.played ? `${Math.round((stats.won / stats.played) * 100)}%` : '0%'], ['Run streak', streak], ['Best', stats.best]].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="font-display text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={share} className="btn-primary mt-6"><Share2 className="w-4 h-4" /> Share</button>
              <p className="text-xs text-muted mt-4">Next word in {countdown}</p>
            </section>
          ) : (
            <div className="w-full select-none" aria-label="Keyboard">
              {ROWS.map((row, i) => (
                <div key={row} className="flex justify-center gap-1.5 mb-1.5">
                  {i === 2 && <button onClick={() => press('ENTER')} className="px-3 h-12 rounded-md bg-surface-tertiary text-foreground text-xs font-bold">ENTER</button>}
                  {[...row].map((k) => {
                    const m = keyMarks.get(k);
                    return (
                      <button key={k} onClick={() => press(k)} className={`flex-1 max-w-10 h-12 rounded-md text-sm font-bold ${m ? TILE[m] : 'bg-surface-tertiary text-foreground'}`}>{k}</button>
                    );
                  })}
                  {i === 2 && <button onClick={() => press('BACKSPACE')} aria-label="Delete" className="px-3 h-12 rounded-md bg-surface-tertiary text-foreground"><Delete className="w-5 h-5" /></button>}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted mt-8 text-center max-w-sm">
            Orange: right letter, right place. Blue: in the word, wrong place. A new word every day at midnight UK time.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
