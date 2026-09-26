import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { NEWS_CONFIG } from './config';
import type { Bundle } from './types';

const W = NEWS_CONFIG.imageWidth;
const H = NEWS_CONFIG.imageHeight;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const REJECTED_CONTENT_TYPES = new Set(['image/svg+xml', 'image/gif']);
const BRANDED_CARD_PHOTO = path.join(process.cwd(), 'public/images/hero/hero-trail.jpg');

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

export function creditLine(photoCredit: string | null, site: string): string {
  if (!photoCredit) return `Photo: ${site}`;
  return photoCredit.toLowerCase().includes(site.toLowerCase())
    ? `Photo: ${photoCredit}`
    : `Photo: ${photoCredit} / ${site}`;
}

export async function stampImage(src: Buffer, credit: string): Promise<Buffer> {
  const stripW = Math.min(W, 16 + credit.length * 9);
  const text = esc(credit);
  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${W - stripW}" y="${H - 34}" width="${stripW}" height="34" fill="black" fill-opacity="0.6"/>
    <text x="${W - 8}" y="${H - 11}" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="white" text-anchor="end">${text}</text>
  </svg>`);
  return sharp(src)
    .rotate()
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .composite([{ input: svg }])
    .webp({ quality: 82 })
    .toBuffer();
}

// ponytail: character-count wrapping, not measured text width. Good enough for a fixed
// font/size; if headlines start visibly clipping, measure with a canvas or use a wider margin.
function wrapHeadline(headline: string, maxLineLen = 30, maxLines = 2): string[] {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let i = 0;
  while (lines.length < maxLines && i < words.length) {
    let line = '';
    while (i < words.length) {
      const next = line ? `${line} ${words[i]}` : words[i];
      if (next.length > maxLineLen) {
        if (!line) {
          line = words[i].slice(0, maxLineLen);
          i++;
        }
        break;
      }
      line = next;
      i++;
    }
    lines.push(line);
  }
  if (i < words.length) {
    const last = lines[lines.length - 1] ?? '';
    lines[lines.length - 1] = `${last.slice(0, maxLineLen - 1)}…`;
  }
  return lines;
}

/** The fallback: the headline over one of Stephen's trail photos, darkened for contrast. */
export async function brandedCard(headline: string): Promise<Buffer> {
  const lines = wrapHeadline(headline);
  const lineSvg = lines
    .map(
      (line, i) =>
        `<text x="60" y="${H / 2 - 10 + i * 64}" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="bold" fill="#fafafa">${esc(line)}</text>`
    )
    .join('');
  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="black" fill-opacity="0.55"/>
    <rect x="0" y="${H - 8}" width="${W}" height="8" fill="#f88c00"/>
    ${lineSvg}
    <text x="60" y="${H - 34}" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#f88c00">Film My Run news</text>
  </svg>`);
  const bg = readFileSync(BRANDED_CARD_PHOTO);
  return sharp(bg).resize(W, H, { fit: 'cover' }).composite([{ input: svg }]).webp({ quality: 85 }).toBuffer();
}

async function download(url: string, fetchFn: typeof fetch): Promise<Buffer | null> {
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/') || REJECTED_CONTENT_TYPES.has(contentType)) return null;
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_SOURCE_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_SOURCE_BYTES) return null;
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w < NEWS_CONFIG.minSourceImageWidth) return null;
    // ponytail: aspect-ratio band (1.0-2.5) is a heuristic for "not a banner or a logo/text
    // graphic". Tighten, or replace with real content detection, if genuine photos get rejected.
    const aspect = w / (h || 1);
    if (aspect < 1.0 || aspect > 2.5) return null;
    return buf;
  } catch {
    return null;
  }
}

interface StoryImageDeps {
  fetch?: typeof fetch;
  upload?: typeof uploadToR2;
  stamp?: typeof stampImage;
}

/** The lead source's photo, else another source's, else a branded card; stored on R2. */
export async function storyImage(
  b: Bundle,
  slug: string,
  deps: StoryImageDeps = {}
): Promise<{ url: string; credit: string | null }> {
  const doFetch = deps.fetch ?? fetch;
  const doUpload = deps.upload ?? uploadToR2;
  const doStamp = deps.stamp ?? stampImage;

  for (const item of b.items) {
    if (!item.imageUrl) continue;
    const buf = await download(item.imageUrl, doFetch);
    if (!buf) continue;
    try {
      const credit = creditLine(item.photoCredit, item.source);
      const url = await doUpload(`news/${slug}.webp`, await doStamp(buf, credit), 'image/webp');
      return { url, credit };
    } catch {
      // A source image that fails to stamp or upload never holds the story back:
      // try the next item, and if all fail, the branded card below is the final fallback.
      continue;
    }
  }
  const url = await doUpload(`news/${slug}.webp`, await brandedCard(b.headline), 'image/webp');
  return { url, credit: null };
}
