import { describe, expect, it } from 'vitest';
import { orderForPage, storyTags } from './present';

describe('story tags', () => {
  it('a topic label, plus UK when British', () => {
    expect(storyTags('trail_ultra', true)).toEqual(['Trail & Ultra', 'UK']);
    expect(storyTags('road', false)).toEqual(['Road']);
    expect(storyTags(null, false)).toEqual(['Trail & Ultra']);
  });
});

describe('the page order', () => {
  const now = new Date('2026-09-27T12:00:00Z');
  const s = (id: string, importance: number, hoursAgo: number) => ({ id, importance, pubDate: new Date(now.getTime() - hoursAgo * 3600_000).toISOString() });
  it('leads with the biggest story of the last three days, the rest newest first', () => {
    const out = orderForPage([s('new-small', 5, 1), s('big', 9, 30), s('older', 7, 20), s('ancient-huge', 10, 24 * 5)], now);
    expect(out.map((x) => x.id)).toEqual(['big', 'new-small', 'older', 'ancient-huge']);
    expect(out[0].topStory).toBe(true);
    expect(out.filter((x) => x.topStory)).toHaveLength(1);
  });
  it('a tie goes to the newer story, and with nothing recent the list is just newest first', () => {
    expect(orderForPage([s('a', 8, 10), s('b', 8, 2)], now)[0].id).toBe('b');
    const stale = orderForPage([s('x', 9, 24 * 6), s('y', 4, 24 * 5)], now);
    expect(stale.map((x) => [x.id, !!x.topStory])).toEqual([['y', false], ['x', false]]);
  });
});
