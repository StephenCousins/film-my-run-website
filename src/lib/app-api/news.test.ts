import { describe, it, expect } from 'vitest';
import { appNewsFeed } from './news';

const now = new Date('2026-09-28T12:00:00Z');
const row = (slug: string, day: number, importance: number) => ({
  slug, title: `T ${slug}`, excerpt: 'x', image_url: '/img/a.webp',
  published_at: new Date(`2026-09-${day}T08:00:00Z`), created_at: new Date('2026-09-01T00:00:00Z'), importance,
});

describe('appNewsFeed', () => {
  it('leads with the top story, then newest first, capped at 12', () => {
    const rows = [row('small-new', 28, 1), row('big', 27, 9), ...Array.from({ length: 12 }, (_, i) => row(`old-${i}`, 10 + i, 0))];
    const feed = appNewsFeed(rows, now);
    expect(feed).toHaveLength(12);
    expect(feed[0]).toEqual({
      slug: 'big', title: 'T big', excerpt: 'x', imageUrl: 'https://filmmyrun.com/img/a.webp',
      publishedAt: '2026-09-27T08:00:00.000Z', url: 'https://filmmyrun.com/news/big', topStory: true,
    });
    expect(feed[1].slug).toBe('small-new');
    expect(feed.slice(1).every((s) => !s.topStory)).toBe(true);
  });
});
