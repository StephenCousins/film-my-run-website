import { describe, expect, it } from 'vitest';
import { flagEmoji } from './flag';
import { bornLine, filmsForFinishes, lastNameWord, personJsonLd, raceKey, runnerTitle, similarRunners, youtubeId } from './present';

describe('page helpers', () => {
  it('a flag from an ISO code, nothing without one', () => {
    expect(flagEmoji('GB')).toBe('🇬🇧');
    expect(flagEmoji('es')).toBe('🇪🇸');
    expect(flagEmoji(null)).toBe('');
    expect(flagEmoji('XYZ')).toBe('');
  });
  it('Person JSON-LD with nationality, photo and source links', () => {
    const ld = personJsonLd({ name: 'Ruth Croft', slug: 'ruth-croft', nationality: 'NZ', photos: [{ kind: 'portrait', url: 'https://r2/p.webp', credit: 'Photo: A', licence: null, source_url: 'https://x' }], bioText: 'Ruth Croft is a New Zealand trail runner.', sameAs: ['https://utmb.world/en/runner/99.ruth.croft'] }) as Record<string, unknown>;
    expect(ld).toMatchObject({ '@type': 'Person', name: 'Ruth Croft', url: 'https://filmmyrun.com/runners/ruth-croft', nationality: 'NZ', image: 'https://r2/p.webp', sameAs: ['https://utmb.world/en/runner/99.ruth.croft'] });
  });
  it('the DB prefilter word is the last name, apostrophe part removed, straight or curly', () => {
    expect(lastNameWord('Ruth Croft')).toBe('Croft');
    expect(lastNameWord('Eoin O\u0027Neill')).toBe('Neill');
    expect(lastNameWord('Eoin O\u2019Neill')).toBe('Neill');
  });
  it('age from a birth year is a pair; legends get the year alone', () => {
    const now = new Date('2026-10-20');
    expect(bornLine(1989, 'current', now)).toBe('Born 1989 (age 36 or 37)');
    expect(bornLine(1956, 'historic', now)).toBe('Born 1956');
    expect(bornLine(null, 'current', now)).toBeNull();
  });
  it('the title names age only when known, UTMB Index only when there is one', () => {
    expect(runnerTitle('Ruth Croft', 1989, 900)).toBe('Ruth Croft: age, results and UTMB Index');
    expect(runnerTitle('Ron Hill', null, null)).toBe('Ron Hill: results and profile');
  });
  it('Person JSON-LD carries the birth year', () => {
    expect(personJsonLd({ name: 'A B', slug: 'a-b', nationality: null, birthYear: 1989, photos: [], bioText: '', sameAs: [] })).toMatchObject({ birthDate: '1989' });
  });
  it('race names match without case, accents or a trailing distance', () => {
    expect(raceKey('UTMB 100')).toBe(raceKey('UTMB'));
    expect(raceKey('Hardrock 100')).toBe('hardrock');
    expect(raceKey('Lavaredo Ultra Trail 120 km')).toBe('lavaredo ultra trail');
    expect(raceKey('UTMB - OCC')).not.toBe(raceKey('UTMB'));
  });
  it('similar runners: shared races first, never someone with nothing in common', () => {
    const c = (slug: string, disciplines: string[], races: string[], utmbIndex: number | null = null) => ({ slug, name: slug, nationality: null, sex: 'F', disciplines, era: 'current', races, utmbIndex });
    const me = c('me', ['trail_ultra'], ['Hardrock 100']);
    const out = similarRunners(me, [me, c('road', ['road'], []), c('trail', ['trail_ultra'], [], 950), c('hardrock', ['trail_ultra'], ['HARDROCK 100'])]);
    expect(out.map((r) => r.slug)).toEqual(['hardrock', 'trail']);
    const man = { ...c('man', ['trail_ultra'], ['Hardrock 100'], 999), sex: 'M' };
    expect(similarRunners(me, [man, c('woman', ['trail_ultra'], ['Hardrock 100'])])[0].slug).toBe('woman');
  });
  it('films match finishes by race, newest film, one per race', () => {
    const films = [{ event: 'UTMB 100', url: 'old', date: '2019-08-30' }, { event: 'UTMB 100', url: 'new', date: '2023-09-01' }, { event: 'UTMB - OCC', url: 'occ', date: '2022-08-26' }];
    const fin = (race: string, year: number) => ({ race, year, distance: null, time: null, position: null, source: 'UTMB' });
    expect(filmsForFinishes([fin('UTMB', 2022), fin('UTMB', 2023), fin('Hardrock 100', 2024)], films)).toEqual([{ race: 'UTMB', film: films[1] }]);
  });
  it('a YouTube id from either link shape', () => {
    expect(youtubeId('https://youtu.be/FAV3CisUHx8')).toBe('FAV3CisUHx8');
    expect(youtubeId('https://www.youtube.com/watch?v=FAV3CisUHx8&t=3')).toBe('FAV3CisUHx8');
    expect(youtubeId('https://vimeo.com/121227292')).toBeNull();
  });
});
