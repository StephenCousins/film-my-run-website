'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Camera, ChevronRight, Map as MapIcon, Mountain, Share2, Shuffle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GameHero from '@/components/games/GameHero';
import {
  BASE, CLUES, CLUE_COST, EMPTY_STATS, GAME_NAME, ROUNDS, liveStreak, pickRounds, record, resultOf, roundScore, shareText,
  type ClueKey, type Mode, type Photo, type RaceData, type Round, type Stats,
} from '@/lib/runguessr/game';

interface Props { number: number; rounds: Round[]; raceCount: number }

/** Today's answers and the player's record live in this browser. */
const KEY = 'runguessr:v1';
interface Saved { day: number; answers: (string | null)[]; clues: ClueKey[][]; stats: Stats }
function load(): Saved | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Saved) : null; } catch { return null; }
}
function save(s: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: the game still works, it just forgets */ }
}

/** Time until midnight in London, when the next five arrive. */
function untilNext(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const left = 86_400 - (get('hour') * 3600 + get('minute') * 60 + get('second'));
  return `${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m`;
}

const MODE: Record<Mode, { label: string; question: string; Icon: typeof Camera }> = {
  photo: { label: 'Photo', question: 'Which race is this?', Icon: Camera },
  profile: { label: 'Elevation', question: 'Whose elevation profile is this?', Icon: Mountain },
  outline: { label: 'Course map', question: 'Whose course is this?', Icon: MapIcon },
};

const blank = () => ({ answers: Array<string | null>(ROUNDS).fill(null), clues: Array.from({ length: ROUNDS }, () => [] as ClueKey[]) });

export default function RunGuessrClient({ number, rounds: daily, raceCount }: Props) {
  const [practice, setPractice] = useState<Round[] | null>(null);
  const rounds = practice ?? daily;
  const [answers, setAnswers] = useState<(string | null)[]>(blank().answers);
  const [clues, setClues] = useState<ClueKey[][]>(blank().clues);
  const [i, setI] = useState(0);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [countdown, setCountdown] = useState('');
  const [message, setMessage] = useState('');
  const [loadingPractice, setLoadingPractice] = useState(false);

  // Restore today's game after mount (localStorage isn't there on the server).
  useEffect(() => {
    const s = load();
    if (!s) return;
    setStats(s.stats);
    if (s.day === number) {
      setAnswers(s.answers);
      setClues(s.clues);
      const next = s.answers.findIndex((a) => a === null);
      setI(next === -1 ? ROUNDS : next);
    }
  }, [number]);

  const scores = rounds.map((r, n) => (answers[n] ? roundScore(answers[n] === r.race.id, clues[n].length) : 0));
  const total = scores.reduce((a, b) => a + b, 0);
  const results = rounds.map((r, n) => resultOf(answers[n] === r.race.id, clues[n].length));
  const finished = i >= ROUNDS;

  const persist = (a: (string | null)[], c: ClueKey[][], s: Stats) => { if (!practice) save({ day: number, answers: a, clues: c, stats: s }); };

  const reveal = (key: ClueKey) => {
    if (answers[i]) return;
    const next = clues.map((c, n) => (n === i && !c.includes(key) ? [...c, key] : c));
    setClues(next);
    persist(answers, next, stats);
  };

  const answer = useCallback((id: string) => {
    if (answers[i] || i >= ROUNDS) return;
    const next = answers.map((a, n) => (n === i ? id : a));
    setAnswers(next);
    let s = stats;
    if (!practice && next.every(Boolean)) {
      const final = rounds.reduce((sum, r, n) => sum + roundScore(next[n] === r.race.id, clues[n].length), 0);
      s = record(stats, number, final);
      setStats(s);
    }
    persist(next, clues, s);
  }, [answers, i, stats, practice, rounds, clues, number]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (!answers[i]) return;
    setI((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [answers, i]);

  // Keyboard: 1-4 to answer, Enter or → for the next round.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || finished) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && rounds[i]) answer(rounds[i].options[n - 1].id);
      if (e.key === 'Enter' || e.key === 'ArrowRight') advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, advance, finished, rounds, i]);

  useEffect(() => {
    if (!finished || practice) return;
    setCountdown(untilNext());
    const t = setInterval(() => setCountdown(untilNext()), 30_000);
    return () => clearInterval(t);
  }, [finished, practice]);

  const startPractice = async () => {
    setLoadingPractice(true);
    try {
      const data = (await (await fetch('/games/runguessr/races.json')).json()) as RaceData;
      const b = blank();
      setPractice(pickRounds(data, Math.floor(Math.random() * 2 ** 31)));
      setAnswers(b.answers);
      setClues(b.clues);
      setI(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setMessage('Could not load more races. Check your connection.');
    } finally {
      setLoadingPractice(false);
    }
  };

  const share = async () => {
    const text = shareText({ number: practice ? null : number, results, total });
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setMessage('Copied. Paste it anywhere.'); setTimeout(() => setMessage(''), 2000); }
    } catch { /* the player closed the share sheet */ }
  };

  const streak = liveStreak(stats, number);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pb-16">
        <GameHero
          eyebrow={practice ? 'Practice five' : 'Daily race quiz'}
          title={GAME_NAME}
          subtitle={<>Guess the race from a photo, an elevation profile or a course map. {raceCount} races and counting.</>}
          bib={{ number: practice ? 'P' : number, label: practice ? 'Practice' : 'Today' }}
          compact
        >
          <div className="flex flex-wrap gap-2 mt-4 text-xs font-medium">
            <span className="rounded-full bg-white/10 px-3 py-1">5 races a day</span>
            <span className="rounded-full bg-white/10 px-3 py-1">Clues cost {CLUE_COST}</span>
            {streak > 0 && !practice && <span className="rounded-full bg-brand/90 px-3 py-1">Streak {streak}</span>}
          </div>
        </GameHero>

        <div className="relative -mt-16 max-w-3xl mx-auto px-4">
          <Progress rounds={rounds} answers={answers} results={results} current={i} />
          {finished ? (
            <Finish rounds={rounds} answers={answers} scores={scores} total={total} stats={stats} streak={streak}
              practice={!!practice} countdown={countdown} onShare={share} onPractice={startPractice} loadingPractice={loadingPractice} message={message} />
          ) : (
            <RoundCard key={`${practice ? 'p' : 'd'}-${i}`} n={i} round={rounds[i]} answer={answers[i]} clues={clues[i]}
              onClue={reveal} onAnswer={answer} onNext={advance} last={i === ROUNDS - 1} />
          )}

          <details className="mt-6 text-sm text-secondary group">
            <summary className="cursor-pointer font-medium text-foreground list-none flex items-center gap-1">
              <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" /> How to play
            </summary>
            <div className="mt-3 space-y-2 pl-5 max-w-prose">
              <p>Five races a day, the same five for everyone. Each race is worth {BASE.toLocaleString('en-GB')} points.</p>
              <p>Stuck? Reveal the distance, climb, month or country. Each clue costs {CLUE_COST} points.</p>
              <p>Course outlines are north up: the green dot is the start, the ring is the finish. On a keyboard, press 1 to 4 to answer and Enter for the next race.</p>
              <p>Photos are from Wikimedia Commons and credited under each one. Courses come from race organisers, OpenStreetMap and Go&amp;Race.</p>
            </div>
          </details>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Progress({ rounds, answers, results, current }: { rounds: Round[]; answers: (string | null)[]; results: ReturnType<typeof resultOf>[]; current: number }) {
  const tone = { clean: 'bg-success text-white', clued: 'bg-warning text-zinc-900', missed: 'bg-error text-white' };
  return (
    <ol className="grid grid-cols-5 gap-2 mb-3" aria-label="Rounds">
      {rounds.map((r, n) => {
        const { Icon, label } = MODE[r.mode];
        const state = answers[n] ? tone[results[n]] : n === current ? 'bg-brand text-white' : 'bg-zinc-800 text-zinc-400';
        return (
          <li key={n} className={`flex items-center justify-center gap-1.5 rounded-lg h-9 text-xs font-semibold transition-colors ${state}`} aria-label={`Race ${n + 1}: ${label}`}>
            <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{n + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}

function RoundCard({ n, round, answer, clues, onClue, onAnswer, onNext, last }: {
  n: number; round: Round; answer: string | null; clues: ClueKey[];
  onClue: (k: ClueKey) => void; onAnswer: (id: string) => void; onNext: () => void; last: boolean;
}) {
  const { race, mode } = round;
  const done = !!answer;
  const correct = answer === race.id;
  const available = BASE - CLUE_COST * clues.length;
  const { Icon, label, question } = MODE[mode];

  return (
    <section className="card shadow-xl shadow-black/10 p-4 sm:p-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand px-2.5 py-1"><Icon className="w-3.5 h-3.5" /> {label}</span>
          Race {n + 1} of {ROUNDS}
        </div>
        <span className={`font-mono text-sm font-semibold tabular-nums ${done ? (correct ? 'text-success' : 'text-error') : 'text-brand'}`}>
          {done ? `+${roundScore(correct, clues.length)}` : `${available} pts`}
        </span>
      </div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-3 text-balance">{question}</h2>

      <div className="mt-4">
        {mode === 'photo' && round.photo ? <PhotoView photo={round.photo} alt="A scene from the mystery race" priority />
          : mode === 'profile' && race.profile ? <ProfileChart profile={race.profile} km={race.km} showKm={done || clues.includes('km')} />
          : race.outline && <OutlineChart outline={race.outline} />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {CLUES.map(({ key, label: l, value }) => {
          const v = value(race);
          const open = done || clues.includes(key);
          if (!v) return (
            <div key={key} className="rounded-xl border border-dashed border-border px-3 py-2 opacity-50">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{l}</p>
              <p className="text-sm text-muted">Not known yet</p>
            </div>
          );
          return (
            <button key={key} onClick={() => onClue(key)} disabled={open}
              className={`text-left rounded-xl px-3 py-2 transition-colors min-w-0 ${open ? 'bg-brand/10' : 'border border-dashed border-border hover:border-brand hover:bg-brand/5'}`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{l}{!open && <span className="text-brand"> · −{CLUE_COST}</span>}</p>
              <p className={`text-sm font-semibold truncate ${open ? 'text-foreground' : 'text-secondary'}`}>{open ? v : 'Reveal'}</p>
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-2 mt-4">
        {round.options.map((o, k) => {
          const state = !done ? 'border-border bg-surface hover:border-brand hover:-translate-y-0.5 hover:shadow-md'
            : o.id === race.id ? 'border-success bg-success text-white'
            : o.id === answer ? 'border-error bg-error text-white' : 'border-border opacity-50';
          return (
            <button key={o.id} onClick={() => onAnswer(o.id)} disabled={done}
              className={`flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3 font-semibold transition-all ${state}`}>
              <span className={`hidden sm:flex w-6 h-6 shrink-0 items-center justify-center rounded-md text-xs font-mono ${done ? 'bg-black/10' : 'bg-surface-tertiary text-muted'}`}>{k + 1}</span>
              <span className="min-w-0">{o.name}</span>
            </button>
          );
        })}
      </div>

      {done && <Reveal round={round} correct={correct} onNext={onNext} last={last} />}
    </section>
  );
}

function Reveal({ round, correct, onNext, last }: { round: Round; correct: boolean; onNext: () => void; last: boolean }) {
  const { race, mode } = round;
  const photo = mode !== 'photo' ? race.photos.find((p) => p.quiz) ?? race.photos[0] : null;
  const facts = [`${race.km} km`, race.gain ? `${race.gain.toLocaleString('en-GB')} m climb` : null, race.month, race.country].filter(Boolean);
  return (
    <div className="mt-6 pt-6 border-t border-border animate-fade-up" role="status" aria-live="polite">
      <p className={`text-xs font-bold uppercase tracking-widest ${correct ? 'text-success' : 'text-error'}`}>{correct ? 'Spot on' : 'Not this time'}</p>
      <div className="grid sm:grid-cols-[minmax(0,1fr)_200px] gap-5 mt-2 items-start">
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold text-foreground">{race.name}</h3>
          {(race.route || race.hook) && <p className="text-secondary mt-1">{[race.route, race.hook].filter(Boolean).map((s) => `${s}.`).join(' ')}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {facts.map((f) => <span key={f} className="font-mono text-xs rounded-md bg-surface-tertiary px-2 py-1 text-foreground">{f}</span>)}
          </div>
        </div>
        <div className="rounded-xl bg-surface-secondary p-2">
          {mode !== 'outline' && race.outline ? <OutlineChart outline={race.outline} small />
            : race.profile ? <ProfileChart profile={race.profile} km={race.km} showKm small /> : null}
        </div>
      </div>
      {photo && <div className="mt-4"><PhotoView photo={photo} alt={race.name} /></div>}
      <div className="flex justify-end mt-5">
        <button onClick={onNext} className="btn-primary inline-flex items-center gap-1.5">{last ? 'See your score' : 'Next race'} <ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function PhotoView({ photo, alt, priority }: { photo: Photo; alt: string; priority?: boolean }) {
  return (
    <figure>
      <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-surface-tertiary">
        <Image src={photo.src} alt={alt} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" priority={priority} />
      </div>
      <figcaption className="text-[11px] text-muted mt-1.5">
        Photo: <a href={photo.page} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">{photo.credit || 'Wikimedia Commons'}</a>, {photo.license}
      </figcaption>
    </figure>
  );
}

function ProfileChart({ profile, km, showKm, small }: { profile: number[]; km: number; showKm: boolean; small?: boolean }) {
  const W = 640, H = small ? 260 : 250, L = small ? 0 : 54, R = 8, T = 16, B = small ? 8 : 30;
  const lo = Math.min(...profile), hi = Math.max(...profile);
  const span = Math.max(hi - lo, 200);
  const step = [100, 200, 250, 500, 1000].find((s) => span / s <= 5) ?? 1000;
  const y0 = Math.floor(lo / step) * step, y1 = Math.ceil((lo + span) / step) * step;
  const x = (n: number) => L + ((W - L - R) * n) / (profile.length - 1);
  const y = (v: number) => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
  const pts = profile.map((v, n) => `${x(n).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ticks: number[] = [];
  for (let v = y0; v <= y1; v += step) ticks.push(v);
  const kmStep = [5, 10, 25, 50, 100].find((s) => km / s <= 8) ?? 100;
  const kms: number[] = [];
  for (let k = 0; k <= km; k += kmStep) kms.push(k);
  return (
    <div className={small ? '' : 'rounded-xl bg-surface-secondary p-2 sm:p-3'}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Elevation profile in metres">
        <defs>
          <linearGradient id={small ? 'rg-fill-s' : 'rg-fill'} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f88c00" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f88c00" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {!small && ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth="1" />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" className="fill-muted font-mono" fontSize="14">{v}</text>
          </g>
        ))}
        {!small && (showKm
          ? kms.map((k) => <text key={k} x={L + ((W - L - R) * k) / km} y={H - 6} textAnchor="middle" className="fill-muted font-mono" fontSize="14">{k}</text>)
          : <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" className="fill-muted font-mono" fontSize="14">distance hidden</text>)}
        <polygon points={`${L},${H - B} ${pts} ${W - R},${H - B}`} fill={`url(#${small ? 'rg-fill-s' : 'rg-fill'})`} />
        <polyline points={pts} fill="none" stroke="#f88c00" strokeWidth={small ? 4 : 2.5} strokeLinejoin="round" pathLength={1} className="rg-draw" />
        {!small && <text x={L - 6} y={T - 2} textAnchor="end" className="fill-muted font-mono" fontSize="14">m</text>}
      </svg>
    </div>
  );
}

function OutlineChart({ outline, small }: { outline: [number, number][]; small?: boolean }) {
  const size = 300, pad = small ? 14 : 22, s = size - 2 * pad;
  const w = Math.max(...outline.map((p) => p[0])), h = Math.max(...outline.map((p) => p[1]));
  const ox = pad + (s - w * s) / 2, oy = pad + (s - h * s) / 2;
  const pts = outline.map(([a, b]) => [ox + a * s, oy + b * s]);
  const d = pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const [sx, sy] = pts[0], [fx, fy] = pts[pts.length - 1];
  return (
    <div className={small ? '' : 'rounded-xl bg-surface-secondary p-2 sm:p-4'}>
      <svg viewBox={`0 0 ${size} ${size}`} className={`w-full h-auto mx-auto ${small ? '' : 'max-w-sm'}`} role="img" aria-label="Course outline, north up">
        {!small && <text x={size - 12} y={20} textAnchor="middle" className="fill-muted font-mono" fontSize="11">N ↑</text>}
        <polyline points={d} fill="none" stroke="#f88c00" strokeOpacity="0.18" strokeWidth={small ? 8 : 10} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={d} fill="none" stroke="#f88c00" strokeWidth={small ? 3.5 : 3} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="rg-draw" />
        <circle cx={fx} cy={fy} r={small ? 7 : 7} className="fill-background stroke-foreground" strokeWidth="2.5" />
        <circle cx={sx} cy={sy} r={small ? 6 : 6} className="fill-success" />
      </svg>
    </div>
  );
}

function Finish({ rounds, answers, scores, total, stats, streak, practice, countdown, onShare, onPractice, loadingPractice, message }: {
  rounds: Round[]; answers: (string | null)[]; scores: number[]; total: number; stats: Stats; streak: number; practice: boolean;
  countdown: string; onShare: () => void; onPractice: () => void; loadingPractice: boolean; message: string;
}) {
  const verdict = total >= 4600 ? 'Course record' : total >= 3800 ? 'Podium' : total >= 2600 ? 'Age-group win' : total >= 1400 ? 'Solid finish' : 'You finished. That counts.';
  return (
    <section className="card shadow-xl shadow-black/10 p-5 sm:p-8 animate-fade-up">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand text-center">{practice ? 'Practice finish' : 'Finish line'}</p>
      <p className="font-display text-6xl sm:text-7xl font-bold text-foreground text-center tabular-nums mt-2">{total.toLocaleString('en-GB')}</p>
      <p className="text-center text-muted text-sm">out of {(ROUNDS * BASE).toLocaleString('en-GB')} · {verdict}</p>

      <ol className="mt-6 divide-y divide-border rounded-xl border border-border overflow-hidden">
        {rounds.map((r, n) => {
          const { Icon } = MODE[r.mode];
          const right = answers[n] === r.race.id;
          return (
            <li key={n} className="flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-surface">
              <span className="font-mono text-xs text-muted w-4">{n + 1}</span>
              <Icon className="w-4 h-4 text-muted shrink-0" />
              <span className="flex-1 min-w-0 truncate font-medium text-foreground">{r.race.name}</span>
              <span className={`font-mono text-sm font-semibold tabular-nums ${right ? 'text-success' : 'text-error'}`}>{right ? `+${scores[n]}` : 'missed'}</span>
            </li>
          );
        })}
      </ol>

      {!practice && (
        <div className="grid grid-cols-4 gap-2 mt-6 text-center">
          {([['Played', stats.played], ['Streak', streak], ['Best', stats.bestScore.toLocaleString('en-GB')], ['Average', stats.played ? Math.round(stats.totalScore / stats.played).toLocaleString('en-GB') : '0']] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-secondary py-3">
              <p className="font-display text-xl sm:text-2xl font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button onClick={onShare} className="btn-primary inline-flex items-center gap-2"><Share2 className="w-4 h-4" /> Share</button>
        <button onClick={onPractice} disabled={loadingPractice} className="btn-secondary inline-flex items-center gap-2">
          <Shuffle className="w-4 h-4" /> {loadingPractice ? 'Loading…' : practice ? 'Another practice five' : 'Practice five'}
        </button>
      </div>
      <p className="text-center text-sm font-medium text-foreground h-5 mt-3" role="status" aria-live="polite">{message}</p>
      {!practice && <p className="text-center text-xs text-muted">Next five in {countdown}. Practice games don&apos;t count towards your streak.</p>}
      <p className="text-center text-xs text-muted mt-4">
        Like word games? Try <Link href="/games/fartlex" className="text-brand font-semibold hover:underline">Fartlex</Link>, the daily running word.
      </p>
    </section>
  );
}
