import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { handleRaces, type RacesDeps, type RaceSummary } from './handlers';

const race = (slug: string, checkpointCount: number): RaceSummary => ({
  slug, name: slug, courseName: null, country: null, distanceKm: 50, elevationGainM: 2000, checkpointCount, verified: false,
});
const course = { slug: 'utmb-occ', checkpoints: [{ name: 'Orsières' }, { name: 'Chamonix' }] };
const deps = (over: Partial<RacesDeps> = {}): RacesDeps => ({
  list: async () => [race('utmb-occ', 15), race('no-checkpoints', 1), { ...race('a-marathon', 6), distanceKm: 42.2 }, { ...race('arc-50', 8), distanceKm: 49 }],
  course: async (slug) => (slug === 'utmb-occ' ? course : null),
  memberForRequest: async (req) => (req.headers.get('Authorization') === 'Bearer club' ? { proUntil: '2099-01-01T00:00:00Z' } : null),
  now: () => Date.parse('2026-09-25T12:00:00Z'),
  ...over,
});
const get = (q = '', headers: Record<string, string> = {}) =>
  new NextRequest(`https://filmmyrun.com/api/app/v1/races${q}`, { headers });

describe('race library', () => {
  it('lists ultras for anyone: a start and a finish, 45 km or more', async () => {
    const res = await handleRaces(get(), deps());
    expect(res.status).toBe(200);
    expect((await res.json()).races.map((r: RaceSummary) => r.slug)).toEqual(['utmb-occ', 'arc-50']);
  });

  it('a course needs FMR Club', async () => {
    expect((await handleRaces(get('?slug=utmb-occ'), deps())).status).toBe(403);
    const res = await handleRaces(get('?slug=utmb-occ', { Authorization: 'Bearer club' }), deps());
    expect(res.status).toBe(200);
    expect((await res.json()).course).toEqual(course);
  });

  it('unknown or malformed slugs are 404, after the club check', async () => {
    expect((await handleRaces(get('?slug=nope', { Authorization: 'Bearer club' }), deps())).status).toBe(404);
    expect((await handleRaces(get('?slug=../../etc', { Authorization: 'Bearer club' }), deps())).status).toBe(404);
  });

  it('Crew Notes down: 503, not an empty library', async () => {
    expect((await handleRaces(get(), deps({ list: async () => null }))).status).toBe(503);
  });
});
