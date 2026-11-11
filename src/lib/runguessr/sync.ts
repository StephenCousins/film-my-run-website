/**
 * RunGuessr record sync for signed-in players (11 Nov 2026), shared by the website and the app.
 * The server keeps one row per finished daily puzzle; the record is those rows replayed through `record()`,
 * so every device agrees by construction. Pure, so it is tested without a database.
 */
import { CLUES, ROUNDS, EMPTY_STATS, record, roundScore, type ClueKey, type Round, type Stats } from './game';

export interface Result { puzzle: number; answers: string[]; clues: ClueKey[][]; score: number }

const CLUE_KEYS = new Set<string>(CLUES.map((c) => c.key));

/** Clues travel and are stored as one comma-joined string per round ("km,gain", ""). */
export const packClues = (clues: ClueKey[][]): string[] => clues.map((c) => c.join(','));
export const unpackClues = (packed: string[]): ClueKey[][] =>
  packed.map((s) => (s ? s.split(',').filter((k): k is ClueKey => CLUE_KEYS.has(k)) : []));

/**
 * Checks a finished game sent by a client against that day's rounds and scores it on the server.
 * Null for anything that isn't five answers to a puzzle that has already started.
 */
export function checkResult(puzzle: unknown, answers: unknown, clues: unknown, today: number, rounds: Round[]): Result | null {
  if (!Number.isInteger(puzzle) || (puzzle as number) < 1 || (puzzle as number) > today) return null;
  if (!Array.isArray(answers) || answers.length !== ROUNDS || rounds.length !== ROUNDS) return null;
  if (!Array.isArray(clues) || clues.length !== ROUNDS) return null;
  const picked = answers.map((a, n) => (typeof a === 'string' && rounds[n].options.some((o) => o.id === a) ? a : null));
  if (picked.some((a) => a === null)) return null;
  const used = clues.map((c) => (Array.isArray(c) ? c : typeof c === 'string' ? (c ? c.split(',') : []) : null));
  if (used.some((c) => c === null || c.length > CLUES.length || c.some((k) => !CLUE_KEYS.has(k)))) return null;
  const tidy = used.map((c) => [...new Set(c as string[])] as ClueKey[]);
  const score = rounds.reduce((sum, r, n) => sum + roundScore(picked[n] === r.race.id, tidy[n].length), 0);
  return { puzzle: puzzle as number, answers: picked as string[], clues: tidy, score };
}

/** The record from a player's rows, oldest first. */
export function statsFrom(rows: { puzzle: number; score: number }[]): Stats {
  let s: Stats = EMPTY_STATS;
  for (const r of [...rows].sort((a, b) => a.puzzle - b.puzzle)) s = record(s, r.puzzle, r.score);
  return s;
}
