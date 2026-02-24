import axios from 'axios';
import sharp from 'sharp';
import { uploadToR2 } from './r2';
import type { RawStorySection } from './irunfar-scraper';

const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 450;

// Generic trail running placeholder (Film My Run branded)
const PLACEHOLDER_URL = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/news/placeholder.webp';

/**
 * Download an image from a URL and return it as a Buffer.
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 10000,
    headers: {
      'User-Agent': 'FilmMyRun-NewsScraper/1.0',
    },
  });
  return Buffer.from(response.data);
}

/**
 * Resize an image buffer to 800x450 WebP format.
 */
async function resizeToWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Build the R2 key for a news story image.
 * Format: news/{year}/{month}/{slug}.webp
 */
function buildR2Key(slug: string, roundupDate: Date): string {
  const year = roundupDate.getFullYear();
  const month = String(roundupDate.getMonth() + 1).padStart(2, '0');
  return `news/${year}/${month}/${slug}.webp`;
}

/**
 * Process and upload a news story image to R2.
 * Returns the public R2 URL, or a placeholder URL on failure.
 */
export async function processNewsImage(
  section: RawStorySection,
  slug: string,
  roundupDate: Date
): Promise<string> {
  // Find the first image from the section
  const sourceImage = section.images[0]
    || section.subsections.flatMap((s) => s.images)[0];

  if (!sourceImage?.src) {
    return PLACEHOLDER_URL;
  }

  try {
    const imageBuffer = await downloadImage(sourceImage.src);
    const webpBuffer = await resizeToWebp(imageBuffer);
    const r2Key = buildR2Key(slug, roundupDate);
    const publicUrl = await uploadToR2(r2Key, webpBuffer, 'image/webp');
    return publicUrl;
  } catch (err) {
    console.error(`Failed to process image for "${slug}":`, err);
    return PLACEHOLDER_URL;
  }
}
