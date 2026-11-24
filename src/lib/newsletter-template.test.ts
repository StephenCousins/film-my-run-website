import { describe, it, expect } from 'vitest';
import { buildNewsletterHtml, withUtm } from './newsletter-template';
import { promoForWeek } from './newsletter-auto-populate';

describe('newsletter template', () => {
  it('news headlines link to their own story, not the news page', () => {
    const html = buildNewsletterHtml(
      { subject: 's', news: [{ title: 'A', url: 'https://filmmyrun.com/news/a', source: 'FMR' }, { title: 'B', url: 'https://filmmyrun.com/news/b', source: 'FMR' }] },
      'https://filmmyrun.com/api/newsletter/unsubscribe?token=t',
      'https://filmmyrun.com',
    );
    expect(html).toContain('href="https://filmmyrun.com/news/a?utm_source=newsletter');
    expect(html).toContain('href="https://filmmyrun.com/news/b?utm_source=newsletter');
    expect(html).toContain('href="https://filmmyrun.com/api/newsletter/unsubscribe?token=t"');
  });

  it('every news story shows its blurb, not just the first', () => {
    const news = ['One', 'Two', 'Three'].map((t, i) => ({ title: t, url: `https://filmmyrun.com/news/${i}`, source: 'FMR', description: `Blurb ${t}` }));
    const html = buildNewsletterHtml({ subject: 's', news }, '#', 'https://filmmyrun.com');
    for (const t of ['One', 'Two', 'Three']) expect(html).toContain(`>Blurb ${t}</p>`);
    // A story without a blurb leaves no empty paragraph behind.
    const bare = buildNewsletterHtml({ subject: 's', news: [news[0], { ...news[1], description: undefined }] }, '#', 'https://filmmyrun.com');
    expect(bare.match(/<p style="margin:6px 0 0;[^"]*">/g)).toBeNull();
  });

  it('shows the view-in-browser link only when given one', () => {
    const url = 'https://filmmyrun.com/api/newsletter/view/52';
    expect(buildNewsletterHtml({ subject: 's' }, '#', 'https://filmmyrun.com', url)).toContain(`<a href="${url}"`);
    expect(buildNewsletterHtml({ subject: 's' }, '#', 'https://filmmyrun.com')).not.toContain('View this email in your browser');
  });

  it('withUtm tags our links only, keeping queries and anchors', () => {
    const out = withUtm('<a href="https://filmmyrun.com/x?a=1#top"></a><a href="https://youtu.be/z"></a>', 'https://filmmyrun.com');
    expect(out).toBe('<a href="https://filmmyrun.com/x?a=1&amp;utm_source=newsletter&amp;utm_medium=email#top"></a><a href="https://youtu.be/z"></a>');
  });

  it('promo rotates shop, Club, app', () => {
    const item = { slug: 'tee', name: 'Tee', subtitle: 'A tee', priceFrom: 25, images: [{ src: 'https://x/t.jpg', position: 'model' }] };
    const kinds = [0, 1, 2, 3].map((w) => promoForWeek(w, 'https://filmmyrun.com', [item] as never).kind);
    expect(kinds).toEqual(['shop', 'club', 'app', 'shop']);
    expect(promoForWeek(0, 'https://filmmyrun.com', [item] as never).url).toBe('https://filmmyrun.com/shop/tee');
  });
});
