import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { displayName, findUtmb, parseRanked, parseRunnerPage, topRunners } from './utmb';

const pageData = readFileSync(new URL('./fixtures/utmb-runner.json', import.meta.url), 'utf8');
const page = `<html><script id="__NEXT_DATA__" type="application/json">${pageData}</script></html>`;
const ranked = JSON.parse(readFileSync(new URL('./fixtures/utmb-ranked.json', import.meta.url), 'utf8'));

describe('UTMB names', () => {
  it('turn capital surnames into ordinary ones', () => {
    expect(displayName('Kilian JORNET BURGADA')).toBe('Kilian Jornet Burgada');
    expect(displayName("Jean-Philippe O'NEILL")).toBe("Jean-Philippe O'Neill");
    expect(displayName('Courtney DAUWALTER')).toBe('Courtney Dauwalter');
    expect(displayName('Ida NILSSON')).toBe('Ida Nilsson');
  });
});

describe('the ranked list', () => {
  it('gives id, uri, index, nationality and sex', () => {
    const r = parseRanked(ranked);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ sex: 'F' });
    expect(typeof r[0].utmbId).toBe('number');
    expect(r[0].uri).toMatch(/^\d+\./);
    expect(r[0].name).not.toMatch(/[A-Z]{3,}/);
  });
  it('an empty or broken reply is an empty list', () => {
    expect(parseRanked(null)).toEqual([]);
    expect(parseRanked({ runners: 'x' })).toEqual([]);
  });
});

describe('a runner page', () => {
  it('reads the general index, website and finished results (no DNFs)', () => {
    const r = parseRunnerPage(page, '2704.kilian.jornetburgada')!;
    expect(r).toMatchObject({ utmbId: 2704, name: 'Kilian Jornet Burgada', index: 947, nationality: 'ES', sex: 'M', website: 'https://www.kilianjornetfoundation.org' });
    expect(r.picture).toBe('https://img.utmb.world/image/upload/q_auto/f_jpg/c_limit,w_1600/v1/worldseries/Members/39d5c4b4-2d37-447f-9b41-4576b1bfb937');
    expect(r.results).toHaveLength(6);
    expect(r.results[0]).toMatchObject({ source: 'UTMB' });
    expect(r.results[0].race).toBeTruthy();
    expect(r.results[0].time).toMatch(/^\d\d:\d\d:\d\d$/);
    expect(r.results.every((x) => x.year >= 2000)).toBe(true);
  });
  it('a page without data, or without a general index, still parses safely', () => {
    expect(parseRunnerPage('<html></html>', '1.x')).toBeNull();
    const noIndex = page.replace('"index": 947', '"index": null');
    expect(parseRunnerPage(noIndex, '2704.kilian.jornetburgada')!.index).toBeNull();
  });
  it('no profilePicture on the page: picture is null', () => {
    const noPicture = pageData.replace(/"profilePicture": "[^"]*",\s*/, '');
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${noPicture}</script></html>`;
    expect(parseRunnerPage(html, '2704.kilian.jornetburgada')!.picture).toBeNull();
  });
});

describe('finding a runner by name', () => {
  it('takes only an exact name match, accents and case aside', async () => {
    const reply = JSON.stringify({ runners: [
      { id: 1, fullname: 'Kilian JORNET', uri: '1.kilian.jornet', ip: 900, nationality: 'ES', sex: 'H' },
      { id: 2704, fullname: 'Kilian JORNET BURGADA', uri: '2704.kilian.jornetburgada', ip: 947, nationality: 'ES', sex: 'H' },
    ] });
    const get = async () => reply;
    expect((await findUtmb('Kilian Jornet Burgada', get))?.utmbId).toBe(2704);
    expect((await findUtmb('Kílian Jornet Burgada', get))?.utmbId).toBe(2704);
    expect(await findUtmb('Kilian Burgada', get)).toBeNull();
  });
});

describe('a blocked or non-JSON reply fails soft', () => {
  it('findUtmb resolves to null rather than throwing', async () => {
    expect(await findUtmb('Kilian Jornet Burgada', async () => '<html>blocked</html>')).toBeNull();
  });
  it('topRunners resolves to an empty list rather than throwing', async () => {
    expect(await topRunners('F', 3, async () => 'not json')).toEqual([]);
  });
});
