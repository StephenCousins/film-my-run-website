/**
 * The Running Stones engine.
 *
 * Model (validated against real MyUTMB data):
 *  - EARN stones at each `utmbEventStatus === 'event'` or `'major'` finish
 *    (category value, doubled at Majors — which UTMB tags as `'major'`).
 *  - SPEND: each Finals acceptance (OCC/CCC/UTMB, `status === 'final'`) consumes
 *    ALL your stones. Past finals are visible here; an upcoming/accepted final
 *    is NOT public, so the UI asks the user about it and applies it on top.
 *  - Available balance = stones earned AFTER your most recent Finals acceptance.
 *  - Stones freeze `FREEZE_YEARS` after your last earning race unless you race
 *    again.
 */

import { CATEGORY_STONES, FREEZE_YEARS, majorForEvent, STATUS_EARNS, STATUS_FINAL, STATUS_MAJOR } from './rules';
import type { RunnerProfile } from './utmb';

export interface EarnedRace {
  dateIso: string;
  eventName: string;
  raceName: string;
  category: string;
  stones: number;
  isMajor: boolean;
  majorLabel?: string;
  spent: boolean; // consumed by a later Finals acceptance
}

export interface FinalRace {
  dateIso: string;
  raceName: string;
  eventName: string;
}

export interface StoneResult {
  earnedRaces: EarnedRace[];
  earnedTotal: number; // lifetime, current system
  finals: FinalRace[]; // past finals (each reset the balance to 0)
  lastFinalDate: string | null;
  availableFromHistory: number; // earned after the most recent past final
  active: boolean; // within the freeze window
  mostRecentEarningDate: string | null;
  generalIndex: number | null;
  hasValidIndex: boolean;
  lotteryEligibleFromHistory: boolean;
}

function desc(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0;
}

export function computeStones(profile: RunnerProfile, now: Date = new Date()): StoneResult {
  const earnedRaces: EarnedRace[] = [];
  const finals: FinalRace[] = [];

  for (const r of profile.results) {
    if (r.utmbEventStatus === STATUS_FINAL) {
      finals.push({ dateIso: r.dateIso, raceName: r.raceName, eventName: r.eventName });
      continue;
    }
    if (r.isDnf) continue;
    if (!STATUS_EARNS.has(r.utmbEventStatus)) continue;
    const cat = (r.piCategory || '').toLowerCase();
    const base = CATEGORY_STONES[cat];
    if (!base) continue;
    const year = parseInt(r.dateIso.slice(0, 4), 10);
    // A Major awards DOUBLE. UTMB flags these two ways and either is enough:
    // its own `utmbEventStatus === 'major'` tag (authoritative), or a name match
    // in our per-year MAJORS map (a fallback for any Major UTMB tags as a plain
    // 'event'). Trusting the status means we no longer miss a Major just because
    // its host isn't in our map yet.
    const nameMajor = majorForEvent(r.eventName, year);
    const isMajor = r.utmbEventStatus === STATUS_MAJOR || !!nameMajor;
    earnedRaces.push({
      dateIso: r.dateIso,
      eventName: r.eventName,
      raceName: r.raceName,
      category: cat,
      stones: base * (isMajor ? 2 : 1),
      isMajor,
      majorLabel: nameMajor?.label ?? (isMajor ? 'UTMB Major' : undefined),
      spent: false,
    });
  }

  earnedRaces.sort((a, b) => desc(a.dateIso, b.dateIso));
  finals.sort((a, b) => desc(a.dateIso, b.dateIso));

  const earnedTotal = earnedRaces.reduce((s, e) => s + e.stones, 0);
  const lastFinalDate = finals.length ? finals[0].dateIso : null;

  // Stones are spent at the Finals lottery / pre-registration (~January of the
  // race's year), NOT on race day. So stones earned between the draw and the
  // race that same year survive. The most recent Finals acceptance consumed
  // everything earned before Jan 1 of its year; anything since is available.
  // (This also correctly handles charity/elite entries, whose exact spend isn't
  // public — they still can't consume stones you hadn't earned yet at the draw.)
  const spendCutoff = lastFinalDate ? `${lastFinalDate.slice(0, 4)}-01-01` : null;
  for (const e of earnedRaces) {
    e.spent = !!spendCutoff && e.dateIso < spendCutoff;
  }
  const availableFromHistory = earnedRaces
    .filter((e) => !e.spent)
    .reduce((s, e) => s + e.stones, 0);

  const mostRecentEarningDate = earnedRaces.length ? earnedRaces[0].dateIso : null;
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - FREEZE_YEARS);
  const active = !!mostRecentEarningDate && new Date(mostRecentEarningDate) >= cutoff;

  const general = profile.performanceIndexes.find((p) => p.piCategory === 'general');
  const generalIndex = general ? general.index : null;
  const hasValidIndex = generalIndex != null;

  const lotteryEligibleFromHistory = hasValidIndex && availableFromHistory > 0 && active;

  return {
    earnedRaces,
    earnedTotal,
    finals,
    lastFinalDate,
    availableFromHistory,
    active,
    mostRecentEarningDate,
    generalIndex,
    hasValidIndex,
    lotteryEligibleFromHistory,
  };
}
