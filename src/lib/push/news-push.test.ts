import { describe, it, expect } from 'vitest';
import { londonClock, inSendWindow, pickStory, newsPayload } from './news-push';

const story = (slug: string) => ({ slug, title: `T ${slug}`, excerpt: '', imageUrl: null, publishedAt: '2026-12-01T03:17:00Z', url: '', topStory: true });

describe('londonClock', () => {
  it('uses BST in summer', () => {
    expect(londonClock(new Date('2026-07-01T06:30:00Z'))).toEqual({ day: '2026-07-01', minutes: 450 });
  });
  it('uses GMT in winter', () => {
    expect(londonClock(new Date('2026-12-01T07:30:00Z'))).toEqual({ day: '2026-12-01', minutes: 450 });
  });
  it('gets the date right just after midnight BST', () => {
    expect(londonClock(new Date('2026-07-01T23:30:00Z')).day).toBe('2026-07-02');
  });
});

describe('inSendWindow', () => {
  const at = (hhmm: string) => new Date(`2026-12-01T${hhmm}:00Z`); // GMT: UTC = London
  it('opens at 07:30 and closes at 11:00', () => {
    expect(inSendWindow(at('07:29'))).toBe(false);
    expect(inSendWindow(at('07:30'))).toBe(true);
    expect(inSendWindow(at('10:59'))).toBe(true);
    expect(inSendWindow(at('11:00'))).toBe(false);
  });
});

describe('pickStory', () => {
  const now = new Date('2026-12-01T07:30:00Z');
  it('takes the first story', () => { expect(pickStory([story('a'), story('b')], null, now)?.slug).toBe('a'); });
  it('sends nothing when the top story was already sent', () => { expect(pickStory([story('a')], 'a', now)).toBeNull(); });
  it('sends nothing on an empty feed', () => { expect(pickStory([], null, now)).toBeNull(); });
  it('sends a story published exactly 36 hours ago', () => {
    expect(pickStory([{ ...story('a'), publishedAt: '2026-11-29T19:30:00Z' }], null, now)?.slug).toBe('a');
  });
  it('sends nothing when the top story is older than 36 hours', () => {
    expect(pickStory([{ ...story('a'), publishedAt: '2026-11-29T19:29:00Z' }], null, now)).toBeNull();
  });
  it('sends nothing when the date is unreadable', () => {
    expect(pickStory([{ ...story('a'), publishedAt: '' }], null, now)).toBeNull();
  });
});

describe('newsPayload', () => {
  it('carries the headline and an in-app link', () => {
    expect(newsPayload(story('big-win'))).toEqual({
      aps: { alert: { title: "Today's running news", body: 'T big-win' }, sound: 'default' },
      url: 'filmmyrun://news/big-win',
    });
  });
});
