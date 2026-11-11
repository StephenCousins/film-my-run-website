/**
 * RunGuessr (11 Nov 2026): a daily race quiz. Five rounds, each one race shown as a photo, an elevation
 * profile or a course outline; pick the race from four. Clues cost points.
 *
 * Race data lives in public/games/runguessr/races.json, built from docs/race-game/ (build_game.py).
 * Everything here is pure so the server can pick today's rounds and the client can pick practice rounds.
 */

export const GAME_NAME = 'RunGuessr';
export const LAUNCH = '2026-11-11';
export const ROUNDS = 5;
export const BASE = 1000;
export const CLUE_COST = 200;

export type Mode = 'photo' | 'profile' | 'outline';

export interface Photo { src: string; quiz: boolean; page: string; license: string; credit: string }

export interface Race {
  id: string;
  name: string;
  country: string;
  type: string;
  month: string | null;
  km: number;
  gain: number | null;
  route: string | null;
  hook: string | null;
  /** Course outline, normalised 0..1, north up. */
  outline: [number, number][] | null;
  /** Elevation in metres at 161 evenly spaced points. */
  profile: number[] | null;
  photos: Photo[];
}

export interface RaceData { courses: Race[]; all: { id: string; name: string }[] }

export interface Round { race: Race; mode: Mode; photo: Photo | null; options: { id: string; name: string }[] }

export type ClueKey = 'km' | 'gain' | 'month' | 'country';
export const CLUES: { key: ClueKey; label: string; value: (r: Race) => string | null }[] = [
  { key: 'km', label: 'Distance', value: (r) => `${r.km} km` },
  { key: 'gain', label: 'Climb', value: (r) => (r.gain ? `${r.gain.toLocaleString('en-GB')} m` : null) },
  { key: 'month', label: 'Month', value: (r) => r.month },
  { key: 'country', label: 'Country', value: (r) => r.country },
];

const DAY = 86_400_000;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);

/** Today in London as YYYY-MM-DD: the puzzle changes at midnight UK time, as Fartlex's does. */
export function londonDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function puzzleNumber(date: string): number {
  return dayNumber(date) - dayNumber(LAUNCH) + 1;
}

/** The London date a puzzle number belongs to (1 is launch day). */
export function dateFor(puzzle: number): string {
  return new Date((dayNumber(LAUNCH) + puzzle - 1) * DAY).toISOString().slice(0, 10);
}

/** Small seeded RNG (mulberry32), so a date always gives the same five. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(date: string): number {
  let h = 2166136261;
  for (const c of `runguessr:${date}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const has: Record<Mode, (r: Race) => boolean> = {
  photo: (r) => r.photos.some((p) => p.quiz),
  profile: (r) => !!r.profile,
  outline: (r) => !!r.outline,
};
const isRoad = (r: Race) => r.type.startsWith('road');

/** Five rounds in a fixed order of kinds (photo, profile, outline, photo, profile), no race twice. */
export function pickRounds(data: RaceData, seed: number): Round[] {
  const r = rng(seed);
  const used = new Set<string>();
  const rounds: Round[] = [];
  for (const want of ['photo', 'profile', 'outline', 'photo', 'profile'] as Mode[]) {
    const mode = ([want, 'outline', 'profile', 'photo'] as Mode[]).find((m) => data.courses.some((c) => !used.has(c.id) && has[m](c)));
    if (!mode) break;
    const race = shuffle(data.courses.filter((c) => !used.has(c.id) && has[mode](c)), r)[0];
    used.add(race.id);
    const photo = mode === 'photo' ? shuffle(race.photos.filter((p) => p.quiz), r)[0] : null;
    // Wrong answers: the same kind of race where possible (road with road, trail with trail), so it isn't a giveaway.
    const alike = shuffle(data.courses.filter((c) => c.id !== race.id && isRoad(c) === isRoad(race)), r);
    const rest = shuffle(data.all.filter((c) => c.id !== race.id && !alike.some((a) => a.id === c.id)), r);
    const options = shuffle([race, ...alike.slice(0, 3), ...rest].slice(0, 4).map(({ id, name }) => ({ id, name })), r);
    rounds.push({ race, mode, photo, options });
  }
  return rounds;
}

export function roundScore(correct: boolean, cluesUsed: number): number {
  return correct ? Math.max(0, BASE - CLUE_COST * cluesUsed) : 0;
}

export type Result = 'clean' | 'clued' | 'missed';
export function resultOf(correct: boolean, cluesUsed: number): Result {
  return !correct ? 'missed' : cluesUsed ? 'clued' : 'clean';
}

const EMOJI: Record<Result, string> = { clean: '🟩', clued: '🟨', missed: '🟥' };

export function shareText(opts: { number: number | null; results: Result[]; total: number }): string {
  const head = opts.number ? `${GAME_NAME} #${opts.number}` : `${GAME_NAME} practice`;
  return `${head}\n${opts.results.map((r) => EMOJI[r]).join('')} ${opts.total.toLocaleString('en-GB')}/${(ROUNDS * BASE).toLocaleString('en-GB')}\nfilmmyrun.com/games/runguessr`;
}

/** A player's record, kept in this browser. A streak is days played in a row. */
export interface Stats { played: number; streak: number; bestStreak: number; lastPlayed: number | null; bestScore: number; totalScore: number }
export const EMPTY_STATS: Stats = { played: 0, streak: 0, bestStreak: 0, lastPlayed: null, bestScore: 0, totalScore: 0 };

/** Records a finished daily game. Finishing the same day twice changes nothing. */
export function record(s: Stats, number: number, score: number): Stats {
  if (s.lastPlayed !== null && number <= s.lastPlayed) return s;
  const streak = s.lastPlayed === number - 1 ? s.streak + 1 : 1;
  return {
    played: s.played + 1, streak, bestStreak: Math.max(s.bestStreak, streak), lastPlayed: number,
    bestScore: Math.max(s.bestScore, score), totalScore: s.totalScore + score,
  };
}

export function liveStreak(s: Stats, today: number): number {
  return s.lastPlayed !== null && s.lastPlayed >= today - 1 ? s.streak : 0;
}
