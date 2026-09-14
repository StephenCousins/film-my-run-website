import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { catalogueLines, formatVersion, readVersionBumps, storesFor, versionsInTitle, PAUSE_MS, VERSION_BUMP_STORES, type VersionBumpDeps } from './versionBumps';

const fx = (n: string) => readFileSync(join(__dirname, '__fixtures__', n), 'utf8');
const empty = '{"resources":{"results":{"products":[]}}}';

/** Serves a fixture per (store, query) and records every URL asked and every pause. */
function serve(answers: Record<string, string | number>, shoes: { brand: string; model: string }[]) {
  const urls: string[] = [];
  const pauses: number[] = [];
  const deps: VersionBumpDeps = {
    currentShoes: async () => shoes,
    pause: async ms => { pauses.push(ms); },
    fetch: async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      const u = new URL(url);
      const key = `${u.host}|${u.searchParams.get('q')}`;
      const a = answers[key];
      if (typeof a === 'number') return new Response('', { status: a });
      return new Response(a === undefined ? empty : fx(a), { status: 200 });
    },
  };
  return { urls, pauses, deps };
}

describe('catalogueLines', () => {
  it('keeps the highest parseable version per (brand, base), case-insensitively, and skips unversioned models', () => {
    expect(catalogueLines([
      { brand: 'Hoka', model: 'Clifton 8' }, { brand: 'Hoka', model: 'Clifton 9' }, { brand: 'Hoka', model: 'clifton 7' },
      { brand: 'Hoka', model: 'Speedgoat GTX' }, { brand: 'New Balance', model: '1080 v14' }, { brand: 'La Sportiva', model: 'Ultra Raptor II' }, { brand: 'Hoka', model: 'Rocket X2' },
    ])).toEqual([
      { brand: 'Hoka', base: 'Clifton', versionNum: 9, pattern: 'number' },
      { brand: 'New Balance', base: '1080', versionNum: 14, pattern: 'v-prefix' },
      { brand: 'La Sportiva', base: 'Ultra Raptor', versionNum: 2, pattern: 'roman' },
      { brand: 'Hoka', base: 'Rocket X', versionNum: 2, pattern: 'x-series' },
    ]);
  });
});

describe('versionsInTitle', () => {
  it('reads the version after the base, through a v, a "+", a variant suffix or a decimal', () => {
    expect(versionsInTitle('Clifton', 'Hoka Clifton 11 Mens Running Shoes - White')).toEqual([11]);
    expect(versionsInTitle('Clifton', 'Hoka Clifton 11 GORE-TEX Mens Running Shoes - Black')).toEqual([11]);
    expect(versionsInTitle('Lone Peak', 'Altra Lone Peak 9+ Mens Trail Running Shoes - Blue')).toEqual([9]);
    expect(versionsInTitle('1080', 'New Balance Fresh Foam X 1080v15 Womens Running Shoes')).toEqual([15]);
    expect(versionsInTitle('1080', 'New Balance 1080 V15')).toEqual([15]);
    expect(versionsInTitle('Flame', "361° Flame 4.5 'Miro' | Running Shoes")).toEqual([4.5]);
    expect(versionsInTitle('Gel-Kayano', 'ASICS Gel Kayano 32 Mens Running Shoes')).toEqual([32]);
    expect(versionsInTitle('Rocket X', 'Hoka Rocket X3 Running Shoes')).toEqual([3]);
    expect(versionsInTitle('Ultra Raptor', 'La Sportiva Ultra Raptor III Trail Running Shoes')).toEqual([3]);
  });
  it('ignores a different line, a longer number, a number run into letters, and a base inside a longer word', () => {
    expect(versionsInTitle('Hyperion Elite', 'Brooks Hyperion Elite LD 2 Running Spikes - Yellow')).toEqual([]);
    expect(versionsInTitle('Wave Rider', 'Mizuno Wave Rider 300')).toEqual([]);
    expect(versionsInTitle('Wave Rider', 'Mizuno Wave Rider 30th Anniversary')).toEqual([]);
    expect(versionsInTitle('Wave Rider', 'Mizuno Wave Rider GORE-TEX Womens Running Shoes - Blue')).toEqual([]);
    expect(versionsInTitle('Flame', "361° Flames 5 'Reverse'")).toEqual([]);
    expect(versionsInTitle('Pegasus', 'Nike Pegasus Trail 5')).toEqual([]);
    expect(versionsInTitle('Clifton', 'Hoka Xclifton 11')).toEqual([]);
    expect(versionsInTitle('Flame', '361° Flame 3.55')).toEqual([]);
  });
});

describe('formatVersion', () => {
  it("writes the new version in the line's own style", () => {
    expect(formatVersion({ base: 'Clifton', pattern: 'number' }, 11)).toBe('Clifton 11');
    expect(formatVersion({ base: 'Flame', pattern: 'number' }, 4.5)).toBe('Flame 4.5');
    expect(formatVersion({ base: '1080', pattern: 'v-prefix' }, 15)).toBe('1080 v15');
    expect(formatVersion({ base: 'Ultra Raptor', pattern: 'roman' }, 3)).toBe('Ultra Raptor III');
    expect(formatVersion({ base: 'Ultra Raptor', pattern: 'roman' }, 11)).toBe('Ultra Raptor 11');
    expect(formatVersion({ base: 'Rocket X', pattern: 'x-series' }, 3)).toBe('Rocket X3');
  });
});

describe('storesFor', () => {
  it("adds the brand's own Shopify store to the retailers, once", () => {
    expect(storesFor('Hoka')).toEqual(VERSION_BUMP_STORES);
    expect(storesFor('Altra')).toEqual([...VERSION_BUMP_STORES, 'www.altrarunning.com/en-us']);
    expect(storesFor('Saucony')).toEqual(VERSION_BUMP_STORES); // html-search, not Shopify
    expect(storesFor('X', ['a.com'], { X: { kind: 'shopify', store: 'a.com' } })).toEqual(['a.com']);
  });
});

describe('readVersionBumps', () => {
  const shoes = [
    { brand: 'Hoka', model: 'Clifton 9' }, { brand: 'Hoka', model: 'Clifton 8' },
    { brand: 'Altra', model: 'Lone Peak 9' },
    { brand: 'Brooks', model: 'Hyperion Elite 4' },
    { brand: 'Mizuno', model: 'Wave Rider 27' },
    { brand: '361°', model: 'Flame 4' },
    { brand: 'Hoka', model: 'Speedgoat GTX' },
  ];
  const answers = {
    'startfitness.co.uk|Hoka Clifton': 'startfitness-suggest-hoka-clifton.json',
    'startfitness.co.uk|Altra Lone Peak': 'startfitness-suggest-altra-lone-peak.json',
    'startfitness.co.uk|Brooks Hyperion Elite': 'startfitness-suggest-brooks-hyperion-elite.json',
    'startfitness.co.uk|Mizuno Wave Rider': 'startfitness-suggest-mizuno-wave-rider.json',
    'kicksown.com|361° Flame': 'kicksown-suggest-361-flame.json',
  };

  it('nominates every version past the catalogue, once per (brand, base, version), titled in the catalogue\'s spelling, with the plainest product as the URL', async () => {
    const { deps } = serve(answers, shoes);
    const r = await readVersionBumps(deps);
    expect(r.empty).toBe(false);
    expect(r.error).toBeUndefined();
    expect(r.nominations.map(n => [n.brandText, n.modelText, n.title])).toEqual([
      ['361°', 'Flame 4.5', '361° Flame 4.5'],
      ['361°', 'Flame 5', '361° Flame 5'],
      ['Brooks', 'Hyperion Elite 5', 'Brooks Hyperion Elite 5'],
      ['Brooks', 'Hyperion Elite 6', 'Brooks Hyperion Elite 6'],
      ['Hoka', 'Clifton 11', 'Hoka Clifton 11'],
      ['Mizuno', 'Wave Rider 28', 'Mizuno Wave Rider 28'],
      ['Mizuno', 'Wave Rider 29', 'Mizuno Wave Rider 29'],
      ['Mizuno', 'Wave Rider 30', 'Mizuno Wave Rider 30'],
    ]);
    // Lone Peak 9+ is the catalogue's 9; Clifton 11 GORE-TEX and WIDE FIT collapse into the plain Clifton 11, whose page is the evidence.
    const clifton = r.nominations.find(n => n.modelText === 'Clifton 11')!;
    expect(clifton).toMatchObject({ source: 'version-bump', publishedAt: null, url: 'https://startfitness.co.uk/products/hoka-clifton-11-mens-running-shoes-white' });
    // The title keeps the catalogue's "Gel-Kayano", not the store's "Gel Kayano".
    const kayano = await readVersionBumps({ ...deps, currentShoes: async () => [{ brand: 'ASICS', model: 'Gel-Kayano 31' }], fetch: async () => new Response(JSON.stringify({ resources: { results: { products: [{ title: 'ASICS Gel Kayano 32 Mens Running Shoes - Black', handle: 'asics-gel-kayano-32' }] } } })) });
    expect(kayano.nominations.map(n => [n.modelText, n.title])).toEqual([['Gel-Kayano 32', 'ASICS Gel-Kayano 32']]);
    expect(r.stores).toEqual([
      { store: 'version-bump:startfitness.co.uk', fetched: 5, nominated: 6 },
      { store: 'version-bump:kicksown.com', fetched: 5, nominated: 2 },
      { store: 'version-bump:www.altrarunning.com/en-us', fetched: 1, nominated: 0 },
      { store: 'version-bump:361europe.com', fetched: 1, nominated: 0 },
    ]);
  });

  it('asks each store for "<brand> <base>" once per line with a pause between, and only the brand store for its own lines', async () => {
    const { urls, pauses, deps } = serve(answers, shoes);
    await readVersionBumps(deps);
    const asked = (store: string) => urls.filter(u => u.startsWith(`https://${store}/`)).map(u => new URL(u).searchParams.get('q'));
    // Speedgoat GTX has no version, so it is not a line and is never asked about.
    expect(asked('startfitness.co.uk')).toEqual(['Hoka Clifton', 'Altra Lone Peak', 'Brooks Hyperion Elite', 'Mizuno Wave Rider', '361° Flame']);
    expect(asked('www.altrarunning.com/en-us')).toEqual(['Altra Lone Peak']);
    expect(asked('361europe.com')).toEqual(['361° Flame']);
    expect(urls[0]).toBe('https://startfitness.co.uk/search/suggest.json?q=Hoka%20Clifton&resources%5Btype%5D=product&resources%5Blimit%5D=10');
    // Five lines per retailer means four pauses each; the brand store asked once needs none.
    expect(pauses).toHaveLength(8);
    expect(pauses.every(p => p === PAUSE_MS)).toBe(true);
  });

  it('a refused store stops being asked and is recorded; the other stores still count', async () => {
    const { urls, deps } = serve({ ...answers, 'startfitness.co.uk|Hoka Clifton': 403 }, shoes);
    const r = await readVersionBumps(deps);
    expect(urls.filter(u => u.startsWith('https://startfitness.co.uk/'))).toHaveLength(1);
    expect(r.stores?.[0]).toEqual({ store: 'version-bump:startfitness.co.uk', fetched: 0, nominated: 0, error: 'unreachable:403' });
    expect(r.nominations.map(n => n.modelText)).toEqual(['Flame 4.5', 'Flame 5']);
    expect(r.error).toBeUndefined();
  });

  it('is empty, carrying the errors, when every store refused', async () => {
    const { deps } = serve({ 'startfitness.co.uk|Hoka Clifton': 503, 'kicksown.com|Hoka Clifton': 404 }, [{ brand: 'Hoka', model: 'Clifton 9' }]);
    expect(await readVersionBumps(deps)).toMatchObject({ source: 'version-bump', empty: true, nominations: [], error: 'startfitness.co.uk (unreachable:503), kicksown.com (HTTP 404)' });
  });

  it('a catalogue with no versioned lines asks nothing', async () => {
    const { urls, deps } = serve({}, [{ brand: 'Hoka', model: 'Speedgoat GTX' }]);
    expect(await readVersionBumps(deps)).toEqual({ source: 'version-bump', nominations: [], empty: true, stores: [] });
    expect(urls).toEqual([]);
  });
});
