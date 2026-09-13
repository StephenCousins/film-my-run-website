import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';

export interface StoreDeps {
  download: (url: string) => Promise<Buffer>;
  upload: (key: string, body: Buffer, contentType: string) => Promise<string>;
}

/** A catalogue shot is a few hundred KB; anything this size is not one, and sharp should not be handed it. */
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

async function downloadImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
    const declared = parseInt(res.headers.get('content-length') ?? '0');
    if (declared > MAX_DOWNLOAD_BYTES) throw new Error(`image too large (${declared} bytes): ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_DOWNLOAD_BYTES) throw new Error(`image too large (${buf.length} bytes): ${url}`);
    return buf;
  } finally {
    clearTimeout(timeout);
  }
}

const liveDeps: StoreDeps = { download: downloadImage, upload: uploadToR2 };

export function imageKey(slug: string): string {
  return `shoes/${slug}.jpg`;
}

/**
 * Copy a verified image into R2 as a ≤1000px JPEG and return its public URL.
 * Hotlinking was the old behaviour; a retailer moving a file left a broken
 * image on the page with nothing to say so.
 */
export async function storeImage(slug: string, sourceUrl: string, deps: StoreDeps = liveDeps): Promise<string> {
  const original = await deps.download(sourceUrl);
  const jpeg = await sharp(original)
    .rotate()
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }) // JPEG has no alpha; transparent PNGs would otherwise go black
    .jpeg({ quality: 85 })
    .toBuffer();
  return deps.upload(imageKey(slug), jpeg, 'image/jpeg');
}
