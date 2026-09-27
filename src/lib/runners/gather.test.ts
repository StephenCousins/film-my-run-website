import { describe, expect, it } from 'vitest';
import { gatherRunner } from './gather';

const utmbSearch = JSON.stringify({ runners: [{ id: 99, fullname: 'Ruth CROFT', uri: '99.ruth.croft', ip: 920, nationality: 'NZ', sex: 'F' }] });
const utmbPage = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { fullname: 'Ruth CROFT', nationalityCode: 'NZ', gender: 'F', website: '', team: 'Adidas', performanceIndexes: [{ piCategory: 'general', index: 920 }], results: { results: [{ dateIso: '2025-08-29', race: 'CCC 2025', eventName: 'UTMB Mont-Blanc', raceName: 'CCC', distance: '100.3', elevationGain: 6100, time: '11:10:00', isDnf: false, rank: 20, rankGender: 1 }] } } } })}</script>`;

const get = (map: Record<string, string | null>) => async (url: string) => Object.entries(map).find(([k]) => url.includes(k))?.[1] ?? null;
const none = async () => [];

describe('gathering a runner', () => {
  it('a current trail runner: UTMB entry, results and our stories as sources', async () => {
    const f = (await gatherRunner({ name: 'Ruth Croft' }, {
      get: get({ 'search=': utmbSearch, '/en/runner/99.ruth.croft': utmbPage }),
      ourStories: async () => [{ title: 'Croft wins CCC', url: 'https://filmmyrun.com/news/croft-wins-ccc', text: 'Ruth Croft won the CCC.' }],
    }))!;
    expect(f).toMatchObject({ slug: 'ruth-croft', name: 'Ruth Croft', nationality: 'NZ', sex: 'F', era: 'current', utmb: { id: 99, index: 920 } });
    expect(f.disciplines).toEqual(['trail_ultra']);
    expect(f.results[0]).toMatchObject({ race: 'UTMB Mont-Blanc CCC', year: 2025, position: '1st woman', source: 'UTMB' });
    expect(f.texts.map((t) => t.source.name)).toEqual(['UTMB', 'Film My Run']);
  });
  it('nobody found anywhere is null (no page is made)', async () => {
    expect(await gatherRunner({ name: 'Nobody Atall' }, { get: get({}), ourStories: none })).toBeNull();
  });
});
