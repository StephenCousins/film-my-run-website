import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, resetRateLimits } from './rate-limit';
import { parseLatestVideo } from './latest-video';
import { activeOffers } from './partner-offers';

describe('rate limit', () => {
  beforeEach(() => resetRateLimits());

  it('allows up to the limit in a window, then refuses with a retry-after', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(checkRateLimit('a', 5, t0 + i)).toBeNull();
    const retry = checkRateLimit('a', 5, t0 + 10);
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(60);
  });

  it('resets after the window and keeps keys separate', () => {
    const t0 = 1_000_000;
    expect(checkRateLimit('a', 1, t0)).toBeNull();
    expect(checkRateLimit('a', 1, t0 + 1)).not.toBeNull();
    expect(checkRateLimit('b', 1, t0 + 1)).toBeNull();
    expect(checkRateLimit('a', 1, t0 + 60_001)).toBeNull();
  });
});

describe('latest video', () => {
  const feed = `<?xml version="1.0"?><feed><title>Film My Run</title>
  <entry><id>yt:video:Lko0J26g1QE</id><yt:videoId>Lko0J26g1QE</yt:videoId>
  <title>Why Was UTMB 2026 SO FAST? The Truth &amp; the Times</title>
  <published>2026-09-09T18:36:54+00:00</published></entry>
  <entry><yt:videoId>older</yt:videoId><title>Older</title><published>2026-09-01T00:00:00+00:00</published></entry></feed>`;

  it('takes the first entry and decodes entities', () => {
    expect(parseLatestVideo(feed)).toEqual({
      id: 'Lko0J26g1QE',
      title: 'Why Was UTMB 2026 SO FAST? The Truth & the Times',
      publishedAt: '2026-09-09T18:36:54+00:00',
      thumbnailUrl: 'https://i.ytimg.com/vi/Lko0J26g1QE/hqdefault.jpg',
      url: 'https://www.youtube.com/watch?v=Lko0J26g1QE',
    });
  });

  it('returns null for an empty or broken feed', () => {
    expect(parseLatestVideo('<feed></feed>')).toBeNull();
    expect(parseLatestVideo('<feed><entry><title>x</title></entry></feed>')).toBeNull();
  });
});

describe('partner offers', () => {
  const offer = (id: string, startsAt: string, endsAt: string) => ({
    id,
    partner: 'P',
    title: 't',
    body: 'b',
    url: 'https://x',
    logoUrl: null,
    startsAt,
    endsAt,
  });

  it('keeps only offers whose dates include today, inclusive', () => {
    const today = new Date('2026-09-11T12:00:00Z');
    const kept = activeOffers(
      [
        offer('past', '2026-08-01', '2026-08-31'),
        offer('now', '2026-09-01', '2026-09-30'),
        offer('edge', '2026-09-11', '2026-09-11'),
        offer('future', '2026-10-01', '2026-10-31'),
      ],
      today
    );
    expect(kept.map((o) => o.id)).toEqual(['now', 'edge']);
  });
});
