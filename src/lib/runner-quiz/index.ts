import content from './content.json';

export type AxisId = 'S' | 'M' | 'D' | 'R';
export type Scores = [number, number, number, number];

export interface QuizAnswer {
  text: string;
  scores: Partial<Record<AxisId, number>>;
}
export interface QuizQuestion {
  q: string;
  answers: QuizAnswer[];
}
export interface QuizFilm {
  id: string;
  title: string;
}
export interface QuizType {
  id: string;
  name: string;
  colour: string;
  target: Scores;
  line: string;
  profile: string;
  traits: string[];
  famous: string;
  race: string;
  mantra: string;
  film: QuizFilm;
  filmAlt: QuizFilm;
  phrases: string[];
  shirt: string;
  shirtLines: string[];
}
export interface Quiz {
  axes: { id: AxisId; low: string; high: string }[];
  questions: QuizQuestion[];
  types: QuizType[];
  calibration: { mean: Scores; sd: Scores; spread: number };
}

export const QUIZ = content as unknown as Quiz;

const AXES: AxisId[] = ['S', 'M', 'D', 'R'];
const clamp = (v: number) => Math.max(0, Math.min(100, v));

// Lowest and highest raw sum each axis can reach across all questions.
const RANGE = AXES.map((a) =>
  QUIZ.questions.reduce(
    ([lo, hi], q) => {
      const vals = q.answers.map((x) => x.scores[a] ?? 0);
      return [lo + Math.min(...vals), hi + Math.max(...vals)];
    },
    [0, 0]
  )
);

/** One answer index (0-3) per question → calibrated 0-100 score per axis (S, M, D, R). */
export function scoreAnswers(answers: number[]): Scores {
  if (!Array.isArray(answers) || answers.length !== QUIZ.questions.length) throw new Error('Invalid quiz answers');
  // A for loop over indices, so holes in a sparse array are caught too.
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!Number.isInteger(a) || a < 0 || a >= QUIZ.questions[i].answers.length) throw new Error('Invalid quiz answers');
  }
  const { mean, sd, spread } = QUIZ.calibration;
  return AXES.map((a, k) => {
    const raw = answers.reduce((sum, ai, qi) => sum + (QUIZ.questions[qi].answers[ai].scores[a] ?? 0), 0);
    const [lo, hi] = RANGE[k];
    const s = (100 * (raw - lo)) / (hi - lo);
    return clamp(Math.round(50 + (spread * (s - mean[k])) / sd[k]));
  }) as Scores;
}

/** All types, nearest target first. */
export function rankTypes(s: Scores): QuizType[] {
  const dist = (t: QuizType) => Math.hypot(...t.target.map((v, i) => v - s[i]));
  return [...QUIZ.types].sort((a, b) => dist(a) - dist(b));
}

export function result(answers: number[]): { scores: Scores; type: QuizType; second: QuizType } {
  const scores = scoreAnswers(answers);
  const [type, second] = rankTypes(scores);
  return { scores, type, second };
}

/** "18-29-45-64" → [18, 29, 45, 64], or null for anything else. */
export function parseScores(str: string | null | undefined): Scores | null {
  const m = /^(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})$/.exec(str ?? '');
  if (!m) return null;
  const s = m.slice(1).map(Number);
  return s.every((v) => v <= 100) ? (s as Scores) : null;
}

export function typeById(id: string | null | undefined): QuizType | undefined {
  return QUIZ.types.find((t) => t.id === id);
}

/**
 * A result posted by the website or the app: `{ type: "<id>", scores: [a, b, c, d] }`.
 * Returns it only if the type exists, the scores are four integers 0-100 and the
 * scores really do point at that type; anything else is null.
 */
export function parseResult(body: unknown): { type: QuizType; scores: Scores } | null {
  if (!body || typeof body !== 'object') return null;
  const { type: id, scores } = body as { type?: unknown; scores?: unknown };
  const type = typeof id === 'string' ? typeById(id) : undefined;
  if (!type || !Array.isArray(scores) || scores.length !== 4) return null;
  if (!scores.every((v) => Number.isInteger(v) && v >= 0 && v <= 100)) return null;
  const s = scores as Scores;
  return rankTypes(s)[0].id === type.id ? { type, scores: s } : null;
}

/** A shared `?r=` value: a type id, or an old four-score link ("18-29-45-64") mapped to its nearest type. */
export function sharedType(r: string | null | undefined): QuizType | undefined {
  const s = parseScores(r);
  return s ? rankTypes(s)[0] : typeById(r);
}
