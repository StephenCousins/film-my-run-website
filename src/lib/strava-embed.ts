/**
 * Strava embed tokens.
 *
 * Strava now issues a per-activity token alongside the embed code, and the
 * embed renders "This content is unavailable. Error code: EEE" without it.
 * Older embeds still work tokenless, so the 50-odd historic posts that carry a
 * bare placeholder in their content are left exactly as they are.
 *
 * Rather than baking the token into post HTML, store it in the post's meta:
 *
 *   meta: { strava_id: '19678997146', strava_embed_token: 'nZKY…' }
 *
 * The placeholder in the content still decides *where* the embed appears; this
 * fills in the token on the way out, so the token stays data.
 */

const PLACEHOLDER = /<div\b[^>]*\bclass="[^"]*\bstrava-embed-placeholder\b[^"]*"[^>]*><\/div>/g;

function getAttr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function setAttr(tag: string, name: string, value: string): string {
  if (getAttr(tag, name) !== null) {
    return tag.replace(new RegExp(`\\b${name}="[^"]*"`), `${name}="${value}"`);
  }
  // Insert before the closing bracket of the opening tag.
  return tag.replace(/></, ` ${name}="${value}"><`);
}

export interface StravaEmbedMeta {
  strava_id?: string;
  strava_embed_token?: string;
}

/**
 * Fill the data-token on any Strava placeholder whose activity id matches the
 * token in meta. Returns the html untouched when there's nothing to do, so
 * legacy posts are unaffected.
 *
 * Run this BEFORE sanitising — the sanitiser allows data-* on divs, so the
 * attribute survives.
 */
export function applyStravaEmbedToken(
  html: string,
  meta: StravaEmbedMeta | null | undefined
): string {
  const token = meta?.strava_embed_token;
  if (!token || !html.includes('strava-embed-placeholder')) return html;

  const activityId = meta?.strava_id;

  return html.replace(PLACEHOLDER, (tag) => {
    // With several embeds in one post, only token the one this meta describes.
    if (activityId && getAttr(tag, 'data-embed-id') !== activityId) return tag;
    return setAttr(tag, 'data-token', token);
  });
}
