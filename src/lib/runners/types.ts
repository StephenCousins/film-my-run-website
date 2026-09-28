/** Runner profiles (spec 2026-09-27-runner-profiles-design.md). */
export type Discipline = 'trail_ultra' | 'road' | 'track';

export interface BestFinish {
  race: string;
  year: number;
  distance: string | null; // "171 km", "Marathon"
  time: string | null; // "19:49:30"
  position: string | null; // "1st", "3rd woman"
  source: string; // the RunnerSource name it came from
  date?: string; // "2025-08-29" when the source gives one (UTMB does)
}

export interface RunnerPhoto {
  kind: 'portrait' | 'action';
  url: string; // R2 URL once saved; the original URL in a work file before
  credit: string; // "Photo: Jane Smith / iRunFar"
  licence: string | null; // "CC BY-SA 4.0" when known
  source_url: string; // the page the photo was found on
}

export interface RunnerSource {
  name: string; // "UTMB", "Wikipedia", "iRunFar"
  url: string;
}

/** A photographer or agency whose images are never used (spec: automated invoices). */
export const AGENCY_CREDITS = /\b(getty|afp|reuters|associated press|ap photo|\bap\b|pa images|pa wire|press association|\bpa\b|shutterstock|alamy)\b/i;

/** Everything gathered on one runner: the work file a session (or auto.ts) writes a bio from. */
export interface RunnerFile {
  slug: string;
  name: string;
  aliases: string[];
  nationality: string | null;
  sex: 'M' | 'F' | null;
  birthYear: number | null;
  disciplines: Discipline[];
  era: 'current' | 'historic';
  utmb: { id: number; uri: string; index: number | null; website: string | null; picture?: string | null } | null;
  /** Source texts the bio may use: each is one RunnerSource plus its text. */
  texts: { source: RunnerSource; text: string }[];
  /** Results that can go straight into best_finishes. */
  results: BestFinish[];
  /** Photo candidates found while gathering (Commons lead image); the session picks. */
  photoCandidates: RunnerPhoto[];
  /** Filled by the writer (session or auto) before save. */
  bio?: string[]; // paragraphs, plain text
  bestFinishes?: BestFinish[];
  photos?: RunnerPhoto[];
  sources?: RunnerSource[];
}
