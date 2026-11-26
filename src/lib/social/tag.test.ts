import { describe, expect, it } from 'vitest';
import { storyTag } from './tag';

const now = new Date('2026-11-26T09:00:00Z');
const base = { title: 'New race announced for the Lake District', excerpt: '', topic: 'road', importance: 5, verdictTypes: ['news'], publishedAt: now, now };

describe('storyTag', () => {
  it('RESULTS when the story reports an outcome, ahead of ULTRA and BREAKING', () => {
    expect(storyTag({ ...base, title: 'Walmsley wins Western States', topic: 'trail_ultra' })).toBe('RESULTS');
    expect(storyTag({ ...base, title: 'Course record falls at Comrades', importance: 9 })).toBe('RESULTS');
    expect(storyTag({ ...base, title: 'Sunday results: who won at Chicago' })).toBe('RESULTS');
  });
  it('only the title counts for results: an excerpt mentioning a past win does not', () => {
    expect(storyTag({ ...base, excerpt: 'The full results from Sunday.' })).toBe('RACE NEWS');
  });
  it('bans, doping, pull-outs, injuries and the like are never RESULTS, even with a win or title in them', () => {
    // The sample cards, 26 Nov 2026: this one came out as RESULTS.
    const jepchirchir = {
      ...base, topic: 'road', importance: 9,
      title: 'Peres Jepchirchir banned for three years for EPO and loses Sydney Marathon title',
      excerpt: 'The Olympic and world marathon champion is banned until October 2029 after EPO was found in a July sample. Two other Kenyans were also sanctioned.',
    };
    expect(storyTag(jepchirchir)).toBe('BREAKING');
    expect(storyTag({ ...jepchirchir, importance: 7 })).toBe('RACE NEWS');
    const kejelcha = {
      ...base, topic: 'road', importance: 6,
      title: 'Yomif Kejelcha pulls out of Valencia Marathon with injury',
      excerpt: "Ethiopia's Yomif Kejelcha, who ran 1:59:41 on his London Marathon debut, has withdrawn from Valencia on 6 December through injury.",
    };
    expect(storyTag(kejelcha)).toBe('RACE NEWS');
    for (const title of [
      'Champion wins appeal against doping ban', 'Record holder suspended by the AIU', 'Course record holder withdraws from UTMB',
      'Winner disqualified at Comrades', 'Police investigate after marathon winner dies', 'Western States record course changes for 2027',
    ]) expect(storyTag({ ...base, title })).not.toBe('RESULTS');
    // A results title with a ban mentioned in the excerpt is not results either.
    expect(storyTag({ ...base, title: 'Kipyegon wins in Eugene', excerpt: 'Her rival is serving a doping ban.' })).not.toBe('RESULTS');
  });
  it('BREAKING for very important, recent hard news', () => {
    expect(storyTag({ ...base, title: 'UTMB cancels 2027 race', importance: 8 })).toBe('BREAKING');
    // A story on demand has no feed items: Stephen has already said it is news.
    expect(storyTag({ ...base, title: 'UTMB cancels 2027 race', importance: 9, verdictTypes: [] })).toBe('BREAKING');
  });
  it('not BREAKING when it is a preview, old, or below the big-story bar', () => {
    expect(storyTag({ ...base, title: 'UTMB 2027 entry list', importance: 9, verdictTypes: ['preview'], topic: 'trail_ultra' })).toBe('ULTRA');
    expect(storyTag({ ...base, title: 'UTMB cancels 2027 race', importance: 9, publishedAt: new Date('2026-11-24T09:00:00Z') })).toBe('RACE NEWS');
    expect(storyTag({ ...base, title: 'UTMB cancels 2027 race', importance: 7 })).toBe('RACE NEWS');
  });
  it('ULTRA for trail and ultra stories, RACE NEWS for the rest', () => {
    expect(storyTag({ ...base, topic: 'trail_ultra' })).toBe('ULTRA');
    expect(storyTag({ ...base, topic: 'road' })).toBe('RACE NEWS');
    expect(storyTag({ ...base, topic: 'track' })).toBe('RACE NEWS');
    expect(storyTag({ title: 'Something happened' })).toBe('RACE NEWS');
  });
});
