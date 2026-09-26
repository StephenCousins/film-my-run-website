import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { NEWS_CONFIG } from './config';
import type { Bundle } from './types';

const W = NEWS_CONFIG.imageWidth;
const H = NEWS_CONFIG.imageHeight;
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function creditLine(photoCredit: string | null, site: string): string {
  if (!photoCredit) return `Photo: ${site}`;
  return photoCredit.toLowerCase().includes(site.toLowerCase())
    ? `Photo: ${photoCredit}`
    : `Photo: ${photoCredit} / ${site}`;
}

export async function stampImage(src: Buffer, credit: string): Promise<Buffer> {
  const text = esc(credit);
  const stripW = Math.min(W, 16 + text.length * 9);
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

/** The fallback: the headline over a dark Film My Run panel. */
export async function brandedCard(headline: string): Promise<Buffer> {
  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#18181b"/>
    <rect x="0" y="${H - 8}" width="${W}" height="8" fill="#f88c00"/>
    <text x="60" y="${H / 2}" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="bold" fill="#fafafa">${esc(headline.slice(0, 40))}</text>
    <text x="60" y="${H / 2 + 60}" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#f88c00">Film My Run news</text>
  </svg>`);
  return sharp(svg).webp({ quality: 85 }).toBuffer();
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    return (meta.width ?? 0) >= NEWS_CONFIG.minSourceImageWidth ? buf : null;
  } catch {
    return null;
  }
}

/** The lead source's photo, else another source's, else a branded card; stored on R2. */
export async function storyImage(b: Bundle, slug: string): Promise<{ url: string; credit: string | null }> {
  for (const item of b.items) {
    if (!item.imageUrl) continue;
    const buf = await download(item.imageUrl);
    if (!buf) continue;
    const credit = creditLine(item.photoCredit, item.source);
    const url = await uploadToR2(`news/${slug}.webp`, await stampImage(buf, credit), 'image/webp');
    return { url, credit };
  }
  const url = await uploadToR2(`news/${slug}.webp`, await brandedCard(b.headline), 'image/webp');
  return { url, credit: null };
}
