import { describe, it, expect } from 'vitest';
import { applyStravaEmbedToken } from './strava-embed';

const placeholder = (extra = '') =>
  `<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="19678997146" data-style="standard" data-from-embed="false"${extra}></div>`;

const meta = { strava_id: '19678997146', strava_embed_token: 'tok-abc123' };

describe('applyStravaEmbedToken', () => {
  it('adds the token from meta to a bare placeholder', () => {
    const out = applyStravaEmbedToken(placeholder(), meta);
    expect(out).toContain('data-token="tok-abc123"');
    expect(out).toContain('data-embed-id="19678997146"');
  });

  it('leaves legacy posts alone when meta has no token', () => {
    const html = placeholder();
    expect(applyStravaEmbedToken(html, { strava_id: '19678997146' })).toBe(html);
    expect(applyStravaEmbedToken(html, null)).toBe(html);
    expect(applyStravaEmbedToken(html, undefined)).toBe(html);
  });

  it('does nothing when the post has no Strava embed', () => {
    const html = '<p>No embed here.</p>';
    expect(applyStravaEmbedToken(html, meta)).toBe(html);
  });

  it('overwrites a token already baked into the markup', () => {
    const out = applyStravaEmbedToken(placeholder(' data-token="stale"'), meta);
    expect(out).toContain('data-token="tok-abc123"');
    expect(out).not.toContain('stale');
  });

  it('only tokens the placeholder matching strava_id', () => {
    const other =
      '<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="99999999999" data-style="standard" data-from-embed="false"></div>';
    const out = applyStravaEmbedToken(placeholder() + other, meta);
    const tokened = out.split('data-token="tok-abc123"').length - 1;
    expect(tokened).toBe(1);
    expect(out).toContain('data-embed-id="99999999999" data-style="standard" data-from-embed="false"></div>');
  });

  it('tokens every placeholder when meta gives no activity id', () => {
    const out = applyStravaEmbedToken(placeholder() + placeholder(), {
      strava_embed_token: 'tok-abc123',
    });
    expect(out.split('data-token="tok-abc123"').length - 1).toBe(2);
  });

  it('preserves surrounding content and placeholder position', () => {
    const html = `<p>before</p>${placeholder()}<p>after</p>`;
    const out = applyStravaEmbedToken(html, meta);
    expect(out.indexOf('<p>before</p>')).toBeLessThan(out.indexOf('strava-embed-placeholder'));
    expect(out.indexOf('strava-embed-placeholder')).toBeLessThan(out.indexOf('<p>after</p>'));
  });

  it('survives the content sanitiser', async () => {
    const { sanitizeContent } = await import('./sanitize');
    const out = sanitizeContent(applyStravaEmbedToken(placeholder(), meta));
    expect(out).toContain('data-token="tok-abc123"');
    expect(out).toContain('strava-embed-placeholder');
  });
});
