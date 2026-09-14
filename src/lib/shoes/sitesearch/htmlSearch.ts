import { decodeHtmlEntities } from '../html';

export interface Anchor { url: string; title: string }

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[1] ?? m[2]) : null;
}

function clean(s: string): string {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Every link on a page as an absolute URL with the best name the markup
 * gives it: a `title`, `aria-label` or Runner's World `data-vars-ga-call-to-
 * action` attribute when there is one (their result card's text is the
 * byline; the headline lives on the attribute), else the anchor's own text.
 * Query strings and
 * fragments are dropped — Saucony appends the colourway as `?dwvar_…` and
 * the same product would otherwise appear once per colour — and the same
 * URL keeps its longest name, since WordPress themes link a result from a
 * thumbnail (no text) and from its headline.
 */
export function parseAnchors(html: string, baseUrl: string): Anchor[] {
  const byUrl = new Map<string, string>();
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(m[1], 'href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
    let url: string;
    try {
      const u = new URL(href, baseUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      u.search = '';
      u.hash = '';
      url = u.toString();
    } catch {
      continue;
    }
    const title = clean(attr(m[1], 'data-vars-ga-call-to-action') ?? attr(m[1], 'title') ?? attr(m[1], 'aria-label') ?? '') || clean(m[2]);
    const prior = byUrl.get(url);
    if (prior === undefined || title.length > prior.length) byUrl.set(url, title);
  }
  return [...byUrl].map(([url, title]) => ({ url, title }));
}
