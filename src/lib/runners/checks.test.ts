import { describe, expect, it } from 'vitest';
import { profileProblems } from './checks';
import type { RunnerFile } from './types';

const base = (over: Partial<RunnerFile> = {}): RunnerFile => ({
  slug: 'ann-trason', name: 'Ann Trason', aliases: [], nationality: 'US', sex: 'F', birthYear: 1960,
  disciplines: ['trail_ultra'], era: 'historic', utmb: null,
  texts: [{ source: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Ann_Trason' }, text: 'Ann Trason won the Western States Endurance Run fourteen times between 1989 and 2003.' }],
  results: [], photoCandidates: [],
  bio: ['Ann Trason is the most successful woman in the history of Western States.', 'She won it fourteen times.', 'Her record stood for years.'],
  bestFinishes: [{ race: 'Western States 100', year: 1994, distance: '161 km', time: '17:37:51', position: '1st woman', source: 'Wikipedia' }],
  photos: [], sources: [{ name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Ann_Trason' }],
  ...over,
});

describe('the save checks', () => {
  it('a sound profile passes', () => {
    expect(profileProblems(base())).toEqual([]);
  });
  it('3 to 5 paragraphs, no em dash, no semicolon', () => {
    expect(profileProblems(base({ bio: ['One.', 'Two.'] }))).toContain('2 paragraphs (3-5)');
    expect(profileProblems(base({ bio: ['a', 'b', 'c', 'd', 'e', 'f'] }))).toContain('6 paragraphs (3-5)');
    expect(profileProblems(base({ bio: ['A — b.', 'Two.', 'Three.'] }))).toContain('em dash');
  });
  it('a near-copy of a source is refused', () => {
    expect(profileProblems(base({ bio: ['Ann Trason won the Western States Endurance Run fourteen times between 1989 and 2003.', 'Two.', 'Three.'] }))).toContain('near-copy of a source');
  });
  it('every best finish names a source the profile lists', () => {
    const f = base({ bestFinishes: [{ race: 'Comrades', year: 1996, distance: null, time: null, position: '1st woman', source: 'Runner’s World' }] });
    expect(profileProblems(f)).toContain('best finish "Comrades 1996" cites Runner’s World, not a listed source');
  });
  it('photos: at most one of each kind, credited, sourced, and never an agency', () => {
    const p = (over: object = {}) => ({ kind: 'portrait' as const, url: 'https://x/y.jpg', credit: 'Photo: Jane Smith / iRunFar', licence: null, source_url: 'https://irunfar.com/a', ...over });
    expect(profileProblems(base({ photos: [p()] }))).toEqual([]);
    expect(profileProblems(base({ photos: [p(), p()] }))).toContain('two portrait photos');
    expect(profileProblems(base({ photos: [p({ credit: 'Photo: Getty Images' })] }))).toContain('agency photo (portrait): Photo: Getty Images');
    expect(profileProblems(base({ photos: [p({ credit: 'Photo: PA Wire / PA Images' })] }))).toContain('agency photo (portrait): Photo: PA Wire / PA Images');
    expect(profileProblems(base({ photos: [p({ credit: '' })] }))).toContain('portrait photo has no credit');
    expect(profileProblems(base({ photos: [p({ source_url: '' })] }))).toContain('portrait photo has no source page');
  });
  it('a bare "PA" credit is refused as an agency photo', () => {
    const p = { kind: 'portrait' as const, url: 'https://x/y.jpg', credit: 'Photo: PA', licence: null, source_url: 'https://pa.media/a' };
    expect(profileProblems(base({ photos: [p] }))).toContain('agency photo (portrait): Photo: PA');
  });
  it('a profile needs a name, a slug and at least one source', () => {
    expect(profileProblems(base({ sources: [] }))).toContain('no sources');
  });
});
