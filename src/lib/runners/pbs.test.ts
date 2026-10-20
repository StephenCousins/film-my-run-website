import { describe, expect, it, vi } from 'vitest';
import { parsePersonalBests, refreshPersonalBests, wikiTitle } from './pbs';

// Shapes copied from real infoboxes (Oct 2026), trimmed.
const ubl = `{{Infobox sportsperson
| name = A
| personal_best = {{ubl
|'''[[Marathon]]''':  2:01:09 ([[2022 Berlin Marathon|Berlin]] 2022)
|'''[[Marathon]]''': 1:59:40{{efn-la|name=ineos}} ([[Ineos 1:59 Challenge|Vienna]] 2019)
|'''[[Mile run|Mile]]''': 3:50.40<ref name="x">{{cite web |url=https://x |title=y}}</ref> (London 2004)
}}
| medal_templates =
}}`;
const sections = `| personal_best = {{ubl
 |'''''Outdoors'''''
 |'''[[1500 metres|1500&nbsp;m]]''': 3:27.80 ([[Paris]] 2024)
 |'''[[Mile run|Mile]]''': 3:43.97 '''{{AthAbbr|AR|North, Central American and Caribbean}}''' ([[Eugene, Oregon|Eugene]] 2023)
 |'''''Indoors'''''
 |'''[[1500 metres|1500&nbsp;m]]''': 3:31.74{{AthAbbr|i}}{{AthAbbr|+}} ([[New York City|New York]] 2025)
 }}
| olympics = x`;
const br = `| personal_best = '''[[800 metres|800 m]]''': 1:44.09<ref name="IAAF"/> <br> '''[[Two miles|2-mile]]''': 8:13.51
| olympics =`;
const colonInBold = `| personal_best = {{unbulleted list
|'''[[Half marathon]]:''' 65:40{{AthAbbr|a|Aided}} '''[[British records in athletics|NR]]''' ([[South Shields]] 2003)
}}
| olympics =`;

describe('personal bests from a Wikipedia infobox', () => {
  it('reads event, time, place and year; footnotes and refs go; the first line for an event wins', () => {
    expect(parsePersonalBests(ubl)).toEqual([
      { event: 'Marathon', section: null, time: '2:01:09', mark: null, place: 'Berlin', year: 2022 },
      { event: 'Mile', section: null, time: '3:50.40', mark: null, place: 'London', year: 2004 },
    ]);
  });
  it('keeps section headings, record marks, and piped links in places', () => {
    expect(parsePersonalBests(sections)).toEqual([
      { event: '1500 m', section: 'Outdoors', time: '3:27.80', mark: null, place: 'Paris', year: 2024 },
      { event: 'Mile', section: 'Outdoors', time: '3:43.97', mark: 'AR', place: 'Eugene', year: 2023 },
      { event: '1500 m', section: 'Indoors', time: '3:31.74', mark: null, place: 'New York', year: 2025 },
    ]);
  });
  it('a <br> list with no places, and a colon inside the bold', () => {
    expect(parsePersonalBests(br).map((p) => [p.event, p.time, p.place])).toEqual([['800 m', '1:44.09', null], ['2-mile', '8:13.51', null]]);
    expect(parsePersonalBests(colonInBold)).toEqual([{ event: 'Half marathon', section: null, time: '65:40', mark: 'NR', place: 'South Shields', year: 2003 }]);
  });
  it('no field, no bests', () => {
    expect(parsePersonalBests('{{Infobox sportsperson\n| name = Ron Hill\n}}')).toEqual([]);
  });
  it('only an English Wikipedia article link gives a title', () => {
    expect(wikiTitle('https://en.wikipedia.org/wiki/Aleksandr_Sorokin_(runner)')).toBe('Aleksandr_Sorokin_(runner)');
    expect(wikiTitle('https://fr.wikipedia.org/wiki/X')).toBeNull();
  });
});

describe('the monthly personal-bests refresh', () => {
  it('reads the cited article only; a failed read or an empty infobox keeps what was stored', async () => {
    const save = vi.fn(async () => {});
    const read = vi.fn(async (t: string) => (t === 'A' ? [{ event: 'Marathon', section: null, time: '2:05:00', mark: null, place: null, year: 2024 }] : t === 'B' ? [] : null));
    const out = await refreshPersonalBests({
      runners: async () => [
        { slug: 'a', sources: [{ name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/A' }] },
        { slug: 'b', sources: [{ name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/B' }] },
        { slug: 'c', sources: [{ name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/C' }] },
        { slug: 'd', sources: [{ name: 'UTMB', url: 'https://utmb.world/en/runner/1.d' }] },
      ],
      read,
      save,
    });
    expect(read).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('a', expect.any(Array));
    expect(out).toEqual({ withPbs: 1, read: 2, cutShort: false });
  });
});
