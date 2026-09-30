import { describe, it, expect } from 'vitest';
import { londonClock, inSendWindow, pickStory, newsPayload } from './news-push';

const story = (slug: string) => ({ slug, title: `T ${slug}`, excerpt: '', imageUrl: null, publishedAt: '', url: '', topStory: true });

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
  it('takes the first story', () => { expect(pickStory([story('a'), story('b')], null)?.slug).toBe('a'); });
  it('sends nothing when the top story was already sent', () => { expect(pickStory([story('a')], 'a')).toBeNull(); });
  it('sends nothing on an empty feed', () => { expect(pickStory([], null)).toBeNull(); });
});

describe('newsPayload', () => {
  it('carries the headline and an in-app link', () => {
    expect(newsPayload(story('big-win'))).toEqual({
      aps: { alert: { title: "Today's running news", body: 'T big-win' }, sound: 'default' },
      url: 'filmmyrun://news/big-win',
    });
  });
});
