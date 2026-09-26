import { describe, expect, it } from 'vitest';
import { placeVenues } from './parkrun-db';

describe('parkrun venue map', () => {
  it('uses the database position, else a closed venue\'s, and drops the rest', () => {
    const out = placeVenues([
      { event: 'Worthing', latitude: '50.81', longitude: '-0.37', visit_count: 101 },
      { event: 'Bois de Boulogne', latitude: null, longitude: null, visit_count: 3 },
      { event: 'Nowhere Known', latitude: null, longitude: null, visit_count: 1 },
    ]);
    expect(out.map((v) => v.event)).toEqual(['Worthing', 'Bois de Boulogne']);
    expect(out[1]).toMatchObject({ latitude: 48.859573, longitude: 2.257737, visit_count: 3 });
    expect(out[0].latitude).toBe(50.81);
  });
});
