import { prisma } from '@/lib/db';
import { BRAND_SITE_ADAPTERS } from '../../sitesearch/config';
import { fetchSiteText, liveSiteFetchDeps, type SiteFetchDeps } from '../../sitesearch/fetch';
import { parseModelVersion, type VersionInfo } from '../../versions';
import { cleanModelText } from './shopifyNewArrivals';
import type { Nomination, SourceResult, StoreStat } from '../types';

/**
 * The catalogue's newest shoe per line, asked of the Shopify stores' own
 * predictive search: a store that lists "Clifton 11" when the catalogue
 * stops at "Clifton 9" has found a release no feed mentioned. Retailers
 * carry every brand; a brand's own store (BRAND_SITE_ADAPTERS, `shopify`
 * kind) is asked for its own lines too. No search API call is spent.
 */
export const VERSION_BUMP_STORES = ['startfitness.co.uk', 'kicksown.com'];

/** A version further ahead than this is noise ("Wave Rider 300", a SKU, a year), not a release. */
export const MAX_VERSION_JUMP = 4;
export const PAUSE_MS = 300;
const SUGGEST_LIMIT = 10;

export interface CatalogueShoe { brand: string; model: string }
export interface VersionBumpDeps extends SiteFetchDeps {
  /** Shoes not superseded by another: the front of every line. */
  currentShoes: () => Promise<CatalogueShoe[]>;
  pause: (ms: number) => Promise<void>;
}

const liveDeps = (): VersionBumpDeps => ({
  ...liveSiteFetchDeps,
  currentShoes: async () => prisma.shoes.findMany({ where: { superseded_by_id: null }, select: { brand: true, model: true } }),
  pause: ms => new Promise(r => setTimeout(r, ms)),
});

/** The newest version the catalogue holds of one line, with the style the line writes its versions in. */
export interface CatalogueLine { brand: string; base: string; versionNum: number; pattern: VersionInfo['pattern'] }

/** One line per (brand, base): the highest version among the shoes whose model parses to one. */
export function catalogueLines(shoes: CatalogueShoe[]): CatalogueLine[] {
  const lines = new Map<string, CatalogueLine>();
  for (const s of shoes) {
    const v = parseModelVersion(s.model);
    if (v.versionNum === null) continue;
    const key = `${s.brand.toLowerCase()}|${v.base.toLowerCase().trim()}`;
    const prior = lines.get(key);
    if (!prior || v.versionNum > prior.versionNum) lines.set(key, { brand: s.brand, base: v.base.trim(), versionNum: v.versionNum, pattern: v.pattern });
  }
  return [...lines.values()];
}

const ROMANS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const ROMAN_VALUE: Record<string, number> = Object.fromEntries(ROMANS.map((r, i) => [r, i]).filter(([r]) => r));

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "Gel-Kayano" must also find "Gel Kayano 32" and "Rocket X" find "Rocket X3"; the base must not start inside a longer word. */
function basePattern(base: string): string {
  return '(?<![a-z0-9])' + base.split(/[\s-]+/).filter(Boolean).map(escapeRegExp).join('[\\s-]*');
}

/**
 * Every version a store title names for this line: "Clifton 11", "Clifton
 * 11 GORE-TEX", "1080v15", "Flame 4.5", "Lone Peak 9+" (the "+" is a
 * mid-cycle refresh of 9, not a version of its own) and, for a line that
 * counts in roman numerals, "Ultra Raptor III". A number run longer than
 * two digits, or followed by more digits or a letter, is a SKU or a size.
 */
export function versionsInTitle(base: string, title: string): number[] {
  const found = new Set<number>();
  // After the base: a "v" that leads straight into digits ("1080v15"), or the end of the word ("Flames 5" is not the Flame).
  const numeric = new RegExp(basePattern(base) + '(?:\\s*v(?=\\d)|(?![a-z])\\s*)(\\d{1,2}(?:\\.\\d)?)(?![\\d.a-z])', 'gi');
  for (const m of title.matchAll(numeric)) found.add(parseFloat(m[1]));
  const roman = new RegExp(basePattern(base) + '(?![a-z])\\s+(I{1,3}|IV|VI{0,3}|IX|X)(?![A-Za-z0-9])', 'g');
  for (const m of title.matchAll(roman)) if (ROMAN_VALUE[m[1]]) found.add(ROMAN_VALUE[m[1]]);
  return [...found];
}

/** The model as the catalogue would write it: "Clifton 11", "1080 v15", "Ultra Raptor III" (numerals past X, and decimals, fall back to digits), "Rocket X3". */
export function formatVersion(line: Pick<CatalogueLine, 'base' | 'pattern'>, version: number): string {
  switch (line.pattern) {
    case 'x-series': return `${line.base}${version}`;
    case 'v-prefix': return `${line.base} v${version}`;
    case 'roman': return Number.isInteger(version) && version <= 10 ? `${line.base} ${ROMANS[version]}` : `${line.base} ${version}`;
    default: return `${line.base} ${version}`;
  }
}

/** The subset of Shopify's predictive-search reply that is read. */
interface SuggestProduct { title?: unknown; handle?: unknown }
interface SuggestReply { resources?: { results?: { products?: SuggestProduct[] } } }

/** The stores asked about one line: the retailers, plus the brand's own Shopify store when it has one. */
export function storesFor(brand: string, retailers = VERSION_BUMP_STORES, adapters = BRAND_SITE_ADAPTERS): string[] {
  const own = adapters[brand];
  const stores = [...retailers];
  if (own?.kind === 'shopify' && !stores.includes(own.store)) stores.push(own.store);
  return stores;
}

interface Bump { line: CatalogueLine; version: number; /** The product title with colour, gender and width stripped (cleanModelText). */ title: string; url: string }

/**
 * One store asked about every line that lists it, in turn, with a pause
 * between requests. A refusal (`unreachable:<status>`), a 404 (no suggest
 * endpoint) or a reply that is not the expected JSON ends the store's run:
 * the remaining lines would only meet the same answer.
 */
async function readStore(store: string, lines: CatalogueLine[], deps: VersionBumpDeps): Promise<{ stat: StoreStat; bumps: Bump[] }> {
  const stat: StoreStat = { store: `version-bump:${store}`, fetched: 0, nominated: 0 };
  const bumps: Bump[] = [];
  for (const [i, line] of lines.entries()) {
    if (i > 0) await deps.pause(PAUSE_MS);
    const q = `${line.brand} ${line.base}`;
    const url = `https://${store}/search/suggest.json?q=${encodeURIComponent(q)}&resources%5Btype%5D=product&resources%5Blimit%5D=${SUGGEST_LIMIT}`;
    let products: SuggestProduct[];
    try {
      const text = await fetchSiteText(url, deps, 'application/json');
      if (text === null) { stat.error = 'HTTP 404'; break; }
      const parsed = (JSON.parse(text) as SuggestReply).resources?.results?.products;
      if (!Array.isArray(parsed)) { stat.error = 'reply had no resources.results.products'; break; }
      products = parsed;
    } catch (err) {
      stat.error = err instanceof Error ? err.message : String(err);
      break;
    }
    stat.fetched++;
    for (const p of products) {
      if (typeof p.title !== 'string' || typeof p.handle !== 'string' || !p.handle) continue;
      for (const version of versionsInTitle(line.base, p.title)) {
        if (version <= line.versionNum || version >= line.versionNum + MAX_VERSION_JUMP) continue;
        bumps.push({ line, version, title: cleanModelText(p.title), url: `https://${store}/products/${p.handle}` });
      }
    }
  }
  stat.nominated = new Set(bumps.map(b => `${b.line.brand}|${b.line.base}|${b.version}`.toLowerCase())).size;
  return { stat, bumps };
}

/**
 * Lines the stores list a newer version of than the catalogue holds. One
 * nomination per (brand, base, version) — "Wave Rider 28", "29" and "30"
 * are three when the catalogue stops at 27 — as evidence the page of the
 * plainest product that named it (the shortest title once colour, gender
 * and width are stripped: "Clifton 11" over "Clifton 11 GORE-TEX"; the
 * first seen on a tie). The nomination's title is "<brand> <base> <N>" in
 * the catalogue's own spelling, not the store's: the normaliser reads the
 * title, and a store's "Gel Cumulus 28" would otherwise open a line beside
 * the catalogue's "Gel-Cumulus" instead of extending it. Stores are read
 * concurrently, each at its own pace. A store's refusal is recorded in
 * `stores`, not thrown: the other stores' answers still count.
 */
export async function readVersionBumps(deps: VersionBumpDeps = liveDeps()): Promise<SourceResult> {
  const source = 'version-bump';
  const lines = catalogueLines(await deps.currentShoes());
  const byStore = new Map<string, CatalogueLine[]>();
  for (const line of lines) for (const store of storesFor(line.brand)) byStore.set(store, [...(byStore.get(store) ?? []), line]);
  const results = await Promise.all([...byStore].map(([store, storeLines]) => readStore(store, storeLines, deps)));

  const best = new Map<string, Bump>();
  for (const b of results.flatMap(r => r.bumps)) {
    const key = `${b.line.brand}|${b.line.base}|${b.version}`.toLowerCase();
    const prior = best.get(key);
    if (!prior || b.title.length < prior.title.length) best.set(key, b);
  }
  const nominations: Nomination[] = [...best.values()]
    .sort((a, b) => a.line.brand.localeCompare(b.line.brand) || a.line.base.localeCompare(b.line.base) || a.version - b.version)
    .map(b => {
      const modelText = formatVersion(b.line, b.version);
      return { brandText: b.line.brand, modelText, title: `${b.line.brand} ${modelText}`, url: b.url, publishedAt: null, source };
    });
  const stores = results.map(r => r.stat);
  const errors = stores.filter(s => s.error).map(s => `${s.store.replace(/^version-bump:/, '')} (${s.error})`);
  return { source, nominations, empty: nominations.length === 0, stores, ...(errors.length && nominations.length === 0 ? { error: errors.join(', ') } : {}) };
}
