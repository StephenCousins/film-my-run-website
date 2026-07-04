/**
 * The Running Stones engine.
 *
 * Model (validated against real MyUTMB data):
 *  - EARN stones at each `utmbEventStatus === 'event'` finish (category value,
 *    doubled at Majors).
 *  - SPEND: each Finals acceptance (OCC/CCC/UTMB, `status === 'final'`) consumes
 *    ALL your stones. Past finals are visible here; an upcoming/accepted final
 *    is NOT public, so the UI asks the user about it and applies it on top.
 *  - Available balance = stones earned AFTER your most recent Finals acceptance.
 *  - Stones freeze `FREEZE_YEARS` after your last earning race unless you race
 *    again.
 */

import { CATEGORY_STONES, FREEZE_YEARS, majorForEvent, STATUS_EARNS, STATUS_FINAL } from './rules';
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
    if (r.utmbEventStatus !== STATUS_EARNS) continue;
    const cat = (r.piCategory || '').toLowerCase();
    const base = CATEGORY_STONES[cat];
    if (!base) continue;
    const year = parseInt(r.dateIso.slice(0, 4), 10);
    const major = majorForEvent(r.eventName, year);
    earnedRaces.push({
      dateIso: r.dateIso,
      eventName: r.eventName,
      raceName: r.raceName,
      category: cat,
      stones: base * (major ? 2 : 1),
      isMajor: !!major,
      majorLabel: major?.label,
      spent: false,
    });
  }

  earnedRaces.sort((a, b) => desc(a.dateIso, b.dateIso));
  finals.sort((a, b) => desc(a.dateIso, b.dateIso));

  const earnedTotal = earnedRaces.reduce((s, e) => s + e.stones, 0);
  const lastFinalDate = finals.length ? finals[0].dateIso : null;

  // Anything earned on or before the most recent Finals acceptance was spent.
  for (const e of earnedRaces) {
    e.spent = !!lastFinalDate && e.dateIso <= lastFinalDate;
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
