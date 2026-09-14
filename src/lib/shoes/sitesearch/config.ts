import type { ReviewSource } from '@prisma/client';
import type { SiteAdapter } from './index';

/**
 * Review sites asked directly for a review of one shoe, in the order their
 * answers are preferred. Probed 14 September 2026 with a Chrome UA:
 * - RTINGS: `/running-shoes/reviews/<brand>/<model>` is 200 with the review
 *   or a 404 page. There is no `rtings` ReviewSource yet, so its reviews are
 *   stored under `other` (one per shoe) until a migration adds the enum value.
 * - The WordPress sites answer `?s=` with a normal result list (The Run
 *   Testers gave one 429 on the first probe and 200 after; a 429 is a
 *   refusal, so the review is picked up by the Brave fallback that week).
 * - Runner's World: `/search/?q=` lists `/gear/a<id>/<slug>/` cards, the
 *   headline on `data-vars-ga-call-to-action`.
 * - Not listed: RunRepeat (403 to every server fetch) and Road Trail Run
 *   (Cloudflare challenge); both stay reachable only through the Brave
 *   fallback in reviews.ts.
 */
export const REVIEW_SITE_LOOKUPS: { source: ReviewSource; adapter: SiteAdapter }[] = [
  { source: 'other', adapter: { kind: 'rtings-url' } },
  { source: 'runners_world', adapter: { kind: 'html-search', searchUrl: 'https://www.runnersworld.com/search/?q={q}', linkPattern: /runnersworld\.com\/gear\/a\d+\// } },
  { source: 'irunfar', adapter: { kind: 'html-search', searchUrl: 'https://www.irunfar.com/?s={q}', linkPattern: /irunfar\.com\/[^/]*review[^/]*\/?$/ } },
  { source: 'believe_in_run', adapter: { kind: 'html-search', searchUrl: 'https://believeintherun.com/?s={q}', linkPattern: /believeintherun\.com\/shoe-reviews\// } },
  { source: 'the_run_testers', adapter: { kind: 'html-search', searchUrl: 'https://theruntesters.com/?s={q}', linkPattern: /theruntesters\.com\/[^/]*review[^/]*\/?$/ } },
  { source: 'running_shoes_guru', adapter: { kind: 'html-search', searchUrl: 'https://www.runningshoesguru.com/?s={q}', linkPattern: /runningshoesguru\.com\/reviews\/[^/]+\/[^/]+\/?$/ } },
  { source: 'doctors_of_running', adapter: { kind: 'html-search', searchUrl: 'https://www.doctorsofrunning.com/?s={q}', linkPattern: /doctorsofrunning\.com\/[^/]*review[^/]*\/?$/ } },
];

/**
 * Brand storefronts with a lookup of their own, keyed by `shoe_brands.name`.
 * Probed 14 September 2026 (`/search/suggest.json` with a Chrome UA):
 * answered with products — 361europe.com, eu.anta.com, nordarun.com,
 * xeroshoes.com, altrarunning.com (only under `/en-us/`; the bare host
 * redirects and mangles the query), atreyu.com, newtonrunning.com,
 * runspeedland.com, mounttocoast.com, lemsshoes.com, freetbarefoot.com,
 * normanwalsh.com. Not Shopify, no adapter: on.com (Nuxt, search is
 * client-side and the HTML is an error shell), tracksmith.com (404),
 * nnormal.com (404), topoathletic.com (200 but an HTML page), diadora.com
 * (404); refused: vivobarefoot.com (403), karhu.com/scarpa.com/raidlight.com
 * (503). Saucony and Nike are not Shopify but their search pages list
 * product links server-side. Everything else goes through the Brave `site:`
 * search in brandPage.ts.
 */
export const BRAND_SITE_ADAPTERS: Record<string, SiteAdapter> = {
  Saucony: { kind: 'html-search', searchUrl: 'https://www.saucony.com/UK/en_GB/search?q={q}', linkPattern: /saucony\.com\/UK\/en_GB\/[a-z0-9-]+\/[0-9A-Za-z]+\.html$/, query: 'model' },
  Nike: { kind: 'html-search', searchUrl: 'https://www.nike.com/gb/w?q={q}', linkPattern: /nike\.com\/gb\/t\//, query: 'model' },
  '361°': { kind: 'shopify', store: '361europe.com' },
  Anta: { kind: 'shopify', store: 'eu.anta.com' },
  Norda: { kind: 'shopify', store: 'nordarun.com' },
  'Xero Shoes': { kind: 'shopify', store: 'xeroshoes.com' },
  Altra: { kind: 'shopify', store: 'www.altrarunning.com/en-us' },
  Atreyu: { kind: 'shopify', store: 'atreyu.com' },
  Newton: { kind: 'shopify', store: 'www.newtonrunning.com' },
  Speedland: { kind: 'shopify', store: 'runspeedland.com' },
  'Mount to Coast': { kind: 'shopify', store: 'mounttocoast.com' },
  Lems: { kind: 'shopify', store: 'www.lemsshoes.com' },
  Freet: { kind: 'shopify', store: 'freetbarefoot.com' },
  Walsh: { kind: 'shopify', store: 'normanwalsh.com' },
};
