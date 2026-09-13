import { completeTextWithImage } from '@/lib/llm';

/**
 * Hosts that serve user-uploaded or editorial photography rather than
 * catalogue shots. Every bad image found in the August 2026 audit came from
 * one of these: eBay listings, Bazaarvoice review uploads, and running
 * magazines shooting shoes on rocks.
 */
export const NON_CATALOGUE_HOSTS = [
  'ebayimg.com', 'bazaarvoice.com', 'switchbacktravel.com', 'outsideonline.com',
  'redd.it', 'redditmedia.com', 'pinimg.com', 'cdninstagram.com', 'fbcdn.net',
];

/**
 * Cheap URL heuristics before a HEAD and a vision call. Two patterns are
 * deliberately narrow: Salesforce Commerce Cloud (Hoka, Brooks, Saucony)
 * serves every catalogue image under a `/default/` path segment, so
 * "default" is only rejected as a filename (`/default.png`,
 * `/default-image.jpg`), and "brand" only as a logo/mark/icon filename or
 * folder, not wherever the word appears in a CDN path.
 */
export function isLikelyProductImage(imageUrl: string): boolean {
  const urlLower = imageUrl.toLowerCase();
  if (NON_CATALOGUE_HOSTS.some(h => urlLower.includes(h))) return false;
  const rejectPatterns = [
    /logo/i, /icon/i, /favicon/i, /\/brand[-_]?(logo|mark|icon)s?[\/.]/i, /swoosh/i,
    /placeholder/i, /\/default[-_.]?(image|product|placeholder)?\.(png|jpe?g|webp|svg|gif)(\?|$)/i, /avatar/i, /badge/i,
    /social[-_]?share/i, /og[-_]?image/i, /banner/i,
    /sprite/i, /pixel/i, /spacer/i, /blank/i,
  ];
  for (const pat of rejectPatterns) {
    if (pat.test(urlLower)) return false;
  }
  const filename = urlLower.split('/').pop()?.split('?')[0] ?? '';
  if (/^image\.(png|jpg|jpeg|webp)$/.test(filename)) return false;
  if (!urlLower.match(/\.(jpg|jpeg|png|webp|avif)/i) && !urlLower.includes('/image')) return false;
  return true;
}

export interface CheckImageSizeDeps {
  fetch: typeof fetch;
}

export async function checkImageSize(imageUrl: string, deps: CheckImageSizeDeps = { fetch }): Promise<{ ok: boolean; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await deps.fetch(imageUrl, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const contentLength = parseInt(res.headers.get('content-length') ?? '0');
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) return { ok: false, reason: `not an image (${contentType})` };
    if (contentLength > 0 && contentLength < 5000) return { ok: false, reason: `too small (likely a logo)` };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

export interface VisionDeps {
  completeTextWithImage: typeof completeTextWithImage;
}

/**
 * Confirm an image is both a usable product shot AND the right shoe.
 *
 * The model check matters as much as the photo check: retailer product pages
 * carry "you may also like" thumbnails, so scraping a page that genuinely is
 * about the Mafate X can still yield a picture of a Mafate hiking boot. Asking
 * only "is this a running shoe?" waves those through.
 *
 * Scope is deliberately limited to what a vision model can actually judge:
 * photo quality, and branding it can read off the shoe. It is NOT asked to
 * confirm a version number — asked to, it invents them (it called a Brooks
 * Ghost 18 a "Ghost 15" from a shoe with no version printed on it). Model
 * identity is the job of the page/URL matching that ran before this.
 *
 * Returns null when the check itself failed (network/API), which callers treat
 * as unverified rather than as a pass.
 */
export async function visionConfirmShoeImage(
  brand: string,
  model: string,
  imageUrl: string,
  deps: VisionDeps = { completeTextWithImage }
): Promise<boolean | null> {
  try {
    const answer = await deps.completeTextWithImage({
      imageUrl,
      maxTokens: 40,
      prompt: `Verify a product photo for a running shoe database.

Expected shoe: ${brand} ${model}

Reply NO if any of these is true:
- It is not a clean catalogue-style product shot: a lifestyle or outdoor scene, a shoe worn on a foot, a hand holding it, an extreme close-up of part of the shoe, a sole or tread close-up, blurry, a logo, or tiny/broken.
- Brand markings visible on the shoe are a different brand from "${brand}".
- A model name printed on the shoe is a different model from "${model}".
- It is obviously a different type of footwear from what the name describes (for example a mid or high-cut boot).

Do NOT reply NO because you cannot confirm a version number. Version numbers are almost never printed on shoes and you cannot tell one version from the next by eye — judge the brand and model line only.

Reply ONLY: YES, or NO followed by a 6-word reason.`,
    });
    if (!answer) return null;
    return answer.toUpperCase().startsWith('YES');
  } catch {
    return null;
  }
}
