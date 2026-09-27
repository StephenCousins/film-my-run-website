import { describe, expect, it } from 'vitest';
import { runNews } from './run';
import { storyCandidates, storyDeps } from './story';
import type { Bundle, Candidate, Verdict } from './types';

const now = new Date('2026-09-27T08:00:00Z');
const page = (title: string, site = 'iRunFar', date = '2026-09-26T10:00:00Z') =>
  `<html><head><meta property="og:title" content="${title}"><meta property="og:site_name" content="${site}"><meta property="article:published_time" content="${date}"><meta property="og:image" content="https://img.test/a.jpg"></head><body><article>${'<p>Tom Evans won UTMB in a new course record after a long day in the Alps above Chamonix.</p>'.repeat(4)}</article></body></html>`;

describe('a story on demand', () => {
  it('turns links into candidates, matching feed items where it can', async () => {
    const pages: Record<string, string> = { 'https://irunfar.test/evans': page('Evans wins UTMB'), 'https://bbc.test/evans': page('Tom Evans wins UTMB', 'BBC Sport') };
    const cands = await storyCandidates(Object.keys(pages), now, {
      fetchHtml: async (u) => pages[u] ?? null,
      feedArticle: async (u) => (u.includes('irunfar') ? { id: 4321, source: 'iRunFar' } : null),
    });
    expect(cands.map((c) => [c.articleId, c.source, c.title])).toEqual([[4321, 'iRunFar', 'Evans wins UTMB'], [0, 'BBC Sport', 'Tom Evans wins UTMB']]);
    expect(cands[0].text).toContain('Tom Evans');
    expect(cands[0].pubDate.toISOString()).toBe('2026-09-26T10:00:00.000Z');
  });

  it('writes and publishes it even when the sorter would not have passed it', async () => {
    const cands: Candidate[] = [{ articleId: 0, url: 'https://bbc.test/evans', source: 'BBC Sport', title: 'Tom Evans wins UTMB', pubDate: now, summary: '', text: 'Tom Evans won UTMB.', imageUrl: null, photoCredit: null }];
    const opinion: Verdict = { type: 'opinion', confidence: 0.4, isRunning: true, topic: 'trail_ultra', isUk: true, importance: 9 };
    const bundles: Bundle[] = [];
    const published: { title: string }[] = [];
    const story = storyDeps(cands, { note: 'Lead with the British angle', sort: async () => ({ verdict: opinion, costUsd: 0.002 }) });
    const log = await runNews({
      now, dryRun: false, maxStories: 1,
      deps: {
        ...story,
        write: async (b) => { bundles.push(b); return { draft: { title: 'Evans wins UTMB', excerpt: 'E.', paragraphs: ['One.', 'Two.', 'Three.'] }, refusal: null, costUsd: 0.06 }; },
        check: async () => ({ ok: true, unsupported: [], costUsd: 0.03 }),
        image: async () => ({ url: 'https://r2.test/x.webp', credit: 'Photo: BBC Sport' }),
        publish: async (s) => { published.push(s); },
        hold: async () => 1,
        more: async () => ({ items: [], costUsd: 0 }),
        monthSpentUsd: async () => 0, recentHeadlines: async () => [], takenSlugs: async () => new Set(), recentSlugs: async () => new Set(),
        markSeen: async () => {},
      },
    });
    expect(published.map((p) => p.title)).toEqual(['Evans wins UTMB']);
    expect(bundles[0].note).toBe('Lead with the British angle');
    expect(bundles[0].onDemand).toBe(true);
    expect(bundles[0].headline).toBe('Tom Evans wins UTMB');
    expect(bundles[0].verdicts[0]).toMatchObject({ type: 'news', isUk: true, importance: 9 });
    expect(log.costUsd).toBeGreaterThan(0.09);
  });
});
