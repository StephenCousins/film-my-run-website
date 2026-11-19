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
