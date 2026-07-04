/**
 * StoneTracker rules & reference data.
 *
 * These encode the UTMB Running Stones system. They change slightly each
 * season — keep them here (not buried in logic) so a rule update is a one-line
 * edit. Confirmed against real runner data (July 2026).
 */

// Base Running Stones awarded for finishing a UTMB World Series Event, by
// category. Doubled at Majors (see MAJORS).
export const CATEGORY_STONES: Record<string, number> = {
  '20k': 1,
  '50k': 2,
  '100k': 3,
  '100m': 4,
};

// Stones freeze this many years after your most recent stone-earning race.
// Racing any UTMB World Series event again reactivates (thaws) them.
export const FREEZE_YEARS = 2;

/**
 * UTMB World Series Majors award DOUBLE stones. One Major per region per year,
 * and the host event rotates — so this is a per-year lookup, matched against
 * the event name.
 *
 * NOTE: verify/extend each season. Historical entries are best-effort; Majors
 * older than the freeze window can't affect an active balance anyway.
 */
export interface MajorRule {
  label: string;
  match: RegExp;
  years: number[];
}

export const MAJORS: MajorRule[] = [
  { label: "Val d'Aran by UTMB (Europe)", match: /val\s*d.?aran/i, years: [2022, 2023, 2024, 2025, 2026] },
  { label: 'Kodiak by UTMB (Americas)', match: /kodiak/i, years: [2024, 2025, 2026] },
  { label: 'Chiang Mai Thailand by UTMB (Asia-Pacific)', match: /chiang\s*mai|thailand/i, years: [2023, 2024, 2025, 2026] },
  { label: 'Ultra-Trail Australia by UTMB (Oceania)', match: /ultra-?trail\s+australia/i, years: [2025, 2026] },
  { label: 'Tarawera by UTMB (Oceania, pre-2025)', match: /tarawera/i, years: [2023, 2024] },
];

export function majorForEvent(eventName: string, year: number): MajorRule | null {
  for (const m of MAJORS) {
    if (m.years.includes(year) && m.match.test(eventName)) return m;
  }
  return null;
}

/**
 * How each result is classified comes straight from UTMB's own
 * `utmbEventStatus` field on every race:
 *   'event' → stone-EARNING World Series event (incl. TDS/MCC/ETC at Mont-Blanc)
 *   'final' → OCC/CCC/UTMB — you SPEND stones to enter these; they earn nothing
 *   ''      → an independent race with a UTMB Index only — earns nothing
 * This means we don't have to maintain the full World Series event list.
 */
export const STATUS_EARNS = 'event';
export const STATUS_FINAL = 'final';
