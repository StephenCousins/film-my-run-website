/**
 * Builds a whole draft from fixed sample data and checks the result, so a change to the builder or template
 * can't quietly bring back an old mistake. Database, parkrun DB and the network are faked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const NOW = new Date('2026-11-16T07:05:00Z'); // a Monday
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const post = (slug: string, daysAgo: number) => ({ title: slug, slug, excerpt: `${slug} excerpt`, featured_image: null, published_at: day(daysAgo) });
const db = {
  issues: [] as { content: unknown }[],
  posts: [post('new-race', 2), post('old-race', 400), post('older-race', 500)],
  stories: [
    { title: 'S1', slug: 's1', excerpt: 'one', image_url: null },
    { title: 'S2', slug: 's2', excerpt: 'two', image_url: null },
    { title: 'S3', slug: 's3', excerpt: 'three', image_url: null },
    { title: 'S4', slug: 's4', excerpt: 'four', image_url: null },
  ],
  parkrunDaysAgo: 2,
};

vi.mock('@/lib/db', () => ({
  prisma: {
    newsletter_issues: { findMany: async () => db.issues },
    news_stories: { findMany: async () => db.stories },
    articles: { findMany: async () => [] },
    posts: {
      findMany: async ({ where }: { where: { published_at?: { lt: Date } } }) =>
        db.posts.filter((p) => !where.published_at || p.published_at < where.published_at.lt),
    },
    races: { findMany: async () => [] },
    newsletter_content_pool: {
      findFirst: async ({ where }: { where: { category: string } }) => ({ title: `${where.category} title`, body: `${where.category} body`, url: '/tools/x', citation: null }),
      update: async () => ({}),
    },
  },
}));
vi.mock('@/lib/parkrun-db', () => ({
  getAllParkruns: async () => [{ date: day(db.parkrunDaysAgo).toISOString(), event: 'Horsham', time_formatted: '20:15', position: 12, time_seconds: 1215 }],
  getMetadata: async () => ({ totalParkruns: 300, uniqueVenues: 80 }),
  getVenueCoordinates: async () => [],
  formatTime: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
}));

const { autoPopulateNewsletter, DEFAULT_SUBJECT } = await import('./newsletter-auto-populate');
const { checkIssue } = await import('./newsletter/checks');
const { buildNewsletterHtml } = await import('./newsletter-template');

const BASE = 'https://filmmyrun.com';
const build = () => autoPopulateNewsletter({ subject: DEFAULT_SUBJECT }, BASE, true);

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  db.issues = [];
  db.parkrunDaysAgo = 2;
  vi.stubGlobal('fetch', async (url: string) =>
    url.includes('youtube.com/feeds')
      ? new Response('<feed><entry><yt:videoId>abcdefghijk</yt:videoId><link rel="alternate" href="https://www.youtube.com/watch?v=abcdefghijk"/><title>New film</title></entry></feed>')
      : new Response('{}', { status: 500 }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('autoPopulateNewsletter (whole draft)', () => {
  it('builds a draft that passes every check', async () => {
    const p = await build();
    expect(p.subject).toBe('new-race');
    expect(p.blogPost?.url).toBe(`${BASE}/blog/new-race`);
    expect(p.fromTheArchives?.url).toBe(`${BASE}/blog/old-race`);
    expect(p.videoOfTheWeek?.url).toBe('https://youtu.be/abcdefghijk');
    expect(p.news?.map((n) => n.url)).toEqual([`${BASE}/news/s1`, `${BASE}/news/s2`, `${BASE}/news/s3`]);
    expect(p.parkrun?.text).toContain('Horsham parkrun');
    expect(p.promo).toBeDefined();
    expect(p.intro).toMatch(/^Morning, runners!/);
    expect(checkIssue(p, { now: NOW, lastParkrun: day(2) })).toEqual([]);

    const html = buildNewsletterHtml(p, '#unsub', BASE);
    expect(html).toContain('href="https://filmmyrun.com/news/s1?utm_source=newsletter');
    for (const s of ['s2', 's3']) expect(html).toContain(`href="https://filmmyrun.com/news/${s}?utm_source=newsletter`);
  });

  it('the archive never repeats the latest post', async () => {
    db.posts = [post('only-old', 400), post('also-old', 500)];
    const p = await build();
    expect(p.blogPost?.url).toBe(`${BASE}/blog/only-old`);
    expect(p.fromTheArchives?.url).toBe(`${BASE}/blog/also-old`);
    db.posts = [post('new-race', 2), post('old-race', 400), post('older-race', 500)];
  });

  it('no parkrun card when the last run was before this weekend', async () => {
    db.parkrunDaysAgo = 9;
    const p = await build();
    expect(p.parkrun).toBeUndefined();
    expect(p.intro).not.toMatch(/parkrun/);
  });

  it('news already sent in recent issues is skipped', async () => {
    db.issues = [{ content: { news: [{ url: `${BASE}/news/s1` }] } }];
    const p = await build();
    expect(p.news?.map((n) => n.url)).toEqual([`${BASE}/news/s2`, `${BASE}/news/s3`, `${BASE}/news/s4`]);
  });
});
