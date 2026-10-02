import EVENTS from './must-cover.json';
import type { Bundle, Topic, Verdict } from './types';

/**
 * Races Stephen says we must always cover (2 Oct 2026): UTMB week, the Majors, Centurion, the
 * Spine, Western States and the rest, with their dates per edition in must-cover.json.
 * Around an edition, a story about it goes first, skips the daily cap and never goes stale;
 * a few days after it finishes with nothing published, the run goes looking for it.
 */
export interface Edition { start: string; end: string; status: 'confirmed' | 'estimated' | 'window' }
export interface MustCoverEvent { name: string; aliases: string[]; topic: Topic; editions: Edition[];
  /** Research notes, for us. */ notes?: string;
  /** What every story on it must include, for the writer ("the women's race"). */ include?: string }

export const MUST_COVER = EVENTS as MustCoverEvent[];

const DAY = 86_400_000;
/** Big stories before an event count too: entries, withdrawals, course changes (Stephen, 2 Oct 2026). */
export const BEFORE_DAYS = 21;
export const AFTER_DAYS = 7;
/** Days after an edition finishes on which the run looks for it if nothing is published. */
export const GAP_FILL_DAYS = [1, 2, 3];

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** A short acronym (UTMB, CCC, MdS) must match its case; a name matches any case. */
function aliasPattern(alias: string): RegExp {
  const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const acronym = alias.length <= 5 && /[A-Z].*[A-Z]/.test(alias);
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, acronym ? 'u' : 'iu');
}

export function mentions(e: MustCoverEvent, text: string): boolean {
  return e.aliases.some((a) => aliasPattern(a).test(text));
}

/** The edition of an event whose window (BEFORE_DAYS before to AFTER_DAYS after) holds `now`. */
export function liveEdition(e: MustCoverEvent, now: Date): Edition | undefined {
  const t = now.getTime();
  return e.editions.find((ed) => t >= day(ed.start) - BEFORE_DAYS * DAY && t < day(ed.end) + (AFTER_DAYS + 1) * DAY);
}

/** The listed event a bundle is about, if its edition is on now. */
export function mustCoverFor(b: Bundle, now: Date, events = MUST_COVER): MustCoverEvent | undefined {
  const text = [b.headline, ...b.items.map((i) => i.title)].join('\n');
  return events.find((e) => liveEdition(e, now) && mentions(e, text));
}

export const mustCoverNote = (e: MustCoverEvent) =>
  `This is ${e.name}, a race we always cover. If British runners are involved (entered, racing or finished), say who and how they did. ${e.include ?? ''}`.trim();

/** Editions that finished GAP_FILL_DAYS ago and have no story published since they started. */
export function gapsToFill(now: Date, published: { title: string; createdAt: Date }[], events = MUST_COVER) {
  const out: { event: MustCoverEvent; edition: Edition }[] = [];
  for (const e of events) {
    for (const ed of e.editions) {
      const daysAfter = Math.floor((now.getTime() - day(ed.end)) / DAY);
      if (!GAP_FILL_DAYS.includes(daysAfter)) continue;
      const covered = published.some((s) => s.createdAt.getTime() >= day(ed.start) - DAY && mentions(e, s.title));
      if (!covered) out.push({ event: e, edition: ed });
    }
  }
  return out;
}

/** A bundle for a gap: no feed items yet, so the run's web search finds the reports. */
export function gapBundle(e: MustCoverEvent, ed: Edition): Bundle {
  const v: Verdict = { type: 'news', confidence: 1, isRunning: true, topic: e.topic, isUk: false, importance: 9 };
  return { key: `must-cover-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ed.end.slice(0, 4)}`, headline: `${e.name} ${ed.end.slice(0, 4)} results`, items: [], verdicts: [v], alreadyCovered: false, note: mustCoverNote(e), mustCover: e.name };
}
