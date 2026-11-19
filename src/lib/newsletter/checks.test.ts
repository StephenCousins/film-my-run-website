import { describe, it, expect } from 'vitest';
import { checkIssue } from './checks';

const MONDAY = new Date('2026-11-16T12:00:00Z');
const SAT = new Date('2026-11-14T00:00:00Z');
const story = (slug: string, description = 'blurb') => ({ title: slug, url: `https://filmmyrun.com/news/${slug}`, source: 'FMR', description });

describe('checkIssue', () => {
  it('a clean issue has no warnings', () => {
    expect(
      checkIssue(
        {
          subject: 's',
          intro: 'Morning, runners! Last Thursday I flew out.',
          blogPost: { title: 'a', url: 'https://filmmyrun.com/blog/a', snippet: '' },
          fromTheArchives: { title: 'b', url: 'https://filmmyrun.com/blog/b', description: '' },
          news: [story('x'), story('y')],
          parkrun: { text: 't' },
        },
        { now: MONDAY, lastParkrun: SAT },
      ),
    ).toEqual([]);
  });

  it('catches every mistake from recent issues', () => {
    const w = checkIssue(
      {
        subject: 's',
        intro: 'Happy weekend, runners! More below.',
        blogPost: { title: 'a', url: 'https://filmmyrun.com/blog/pennine', snippet: '' },
        fromTheArchives: { title: 'a', url: 'https://filmmyrun.com/blog/pennine/?utm_source=x', description: '' },
        news: [story('x', ''), { ...story('y'), url: 'https://filmmyrun.com/news/' }],
        parkrun: { text: 't' },
      },
      { now: MONDAY, lastParkrun: new Date('2026-11-07T00:00:00Z') },
    );
    expect(w).toHaveLength(5);
    expect(w.join('\n')).toMatch(/From the archives is the same link as Latest post/);
    expect(w.join('\n')).toMatch(/News 1 .* no blurb/);
    expect(w.join('\n')).toMatch(/News 2 .* news page/);
    expect(w.join('\n')).toMatch(/weekend but it's Monday/);
    expect(w.join('\n')).toMatch(/last parkrun was 2026-11-07/);
  });

  it('a named day in the greeting must be today', () => {
    expect(checkIssue({ subject: 's', intro: 'Happy Friday!' }, { now: MONDAY })).toEqual(["The greeting mentions Friday but it's Monday."]);
    expect(checkIssue({ subject: 's', intro: 'Happy Monday!' }, { now: MONDAY })).toEqual([]);
  });

  it('a parkrun card with no parkrun on record is flagged', () => {
    expect(checkIssue({ subject: 's', parkrun: { text: 't' } }, { now: MONDAY, lastParkrun: null })).toHaveLength(1);
  });
});
