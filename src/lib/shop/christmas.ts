/**
 * Christmas 2026 in the shop: the last order dates and the gift guide's sections.
 *
 * Last order dates are our own cautious estimate (20 Oct 2026), not Printify's: Print
 * Clever (UK tees, hoodies, totes) quotes 2-5 working days, then Royal Mail Tracked 48,
 * whose last posting day is Saturday 19 December. Caps print in the US, mugs and posters
 * in the EU, so they get an earlier date. Change them here when Printify publishes its
 * 2026 dates; everything that shows a date reads these.
 */
export const LAST_ORDER_UK = '2026-12-10';
export const LAST_ORDER_ABROAD = '2026-12-01';
export const GIFT_GUIDE_PATH = '/shop/christmas';

/** "Thursday 10 December". */
export const orderByLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' });

/** Christmas messages show until the UK last order date has passed (UK time). */
export function christmasOn(now = new Date()): boolean {
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); // YYYY-MM-DD
  return today <= LAST_ORDER_UK;
}

export interface GuideSection { title: string; blurb: string; slugs: string[] }

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: 'For the ultra runner',
    blurb: 'The one who thinks a marathon is a warm-up, and means it.',
    slugs: ['how-hard-can-it-be', '100-miles-lousy-tshirt', 'held-the-demons-back', 'glorious-up-above-diabolical-down-below', 'everythings-longer', 'hoodie-how-hard-can-it-be'],
  },
  {
    title: 'For the marathon runner',
    blurb: 'For anyone who has said "never again" at mile 22 and entered the next one by teatime.',
    slugs: ['ask-me-again-at-halfway', 'legs-have-gone', 'rapidly-losing-my-patience', 'bonus-miles', 'threw-up-now-i-feel-great', 'hoodie-ask-me-again-at-halfway'],
  },
  {
    title: 'For the parkrunner',
    blurb: 'Saturday, 9am, every week. Rain or shine. Mostly rain.',
    slugs: ['just-a-parkrun-to-go', 'see-you-on-the-start-line', 'plan-for-today-finish', 'not-my-best-not-bad', 'cap-just-a-parkrun-to-go', 'hoodie-just-a-parkrun-to-go'],
  },
  {
    title: 'For the one who is mostly there for the cake',
    blurb: 'Every club has one. Some clubs are entirely made of them.',
    slugs: ['should-be-running-eating-cake', 'no-coffee-no-cake-no-sympathy', 'get-on-with-it', 'everything-hurts', 'hoodie-should-be-running-eating-cake', 'hoodie-no-coffee-no-cake-no-sympathy'],
  },
  {
    title: 'Stocking fillers under £20',
    blurb: 'Mugs, totes and posters. Made to order, like everything else.',
    slugs: ['mug-wrap-around-runner', 'mug-end-credits', 'tote-clapperboard', 'tote-contact-sheet', 'poster-contact-sheet', 'poster-end-credits'],
  },
];

/** What a runner page knows about its runner, as far as picking a tee goes. */
export interface TeeRunner { slug: string; era: string; disciplines: string[]; distances: (string | null)[] }

const POOLS = {
  hundred: ['how-hard-can-it-be', '100-miles-lousy-tshirt', 'held-the-demons-back'],
  mountain: ['glorious-up-above-diabolical-down-below', 'thats-the-hard-part-done', 'everythings-longer'],
  trail: ['another-marathon-another-ultra', 'everythings-longer', 'held-the-demons-back'],
  road: ['ask-me-again-at-halfway', 'legs-have-gone', 'rapidly-losing-my-patience', 'bonus-miles'],
  track: ['not-my-best-not-bad', 'threw-up-now-i-feel-great', 'get-on-with-it'],
  legend: ['see-you-on-the-start-line', 'held-the-demons-back'],
};

const km = (d: string | null) => Number(d?.match(/^(\d+(?:\.\d+)?)\s*km/)?.[1] ?? 0);
const climb = (d: string | null) => Number(d?.match(/([\d,]+)\s*m climb/)?.[1].replace(/,/g, '') ?? 0);

/**
 * The slogan tee that fits a runner: a 100-miler gets "How Hard Can It Be?", a
 * mountain runner "Glorious Up Above", a road runner "Ask Me Again at Halfway". The
 * slug picks within the pool, so a page always shows the same tee.
 */
export function teeForRunner(r: TeeRunner): string {
  const pool = r.era === 'historic' ? POOLS.legend
    : r.disciplines.includes('trail_ultra')
      ? r.distances.some((d) => km(d) >= 150) ? POOLS.hundred
        : r.distances.some((d) => climb(d) >= 2500) ? POOLS.mountain
          : POOLS.trail
      : r.disciplines.includes('road') ? POOLS.road
        : r.disciplines.includes('track') ? POOLS.track
          : POOLS.trail;
  let h = 0;
  for (const c of r.slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
