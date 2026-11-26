// The social card: a 1080x1350 PNG (Instagram portrait, fine on Facebook too).
//
// The stored story photo is 1200x675, so it can't fill a portrait frame without heavy
// upscaling. It goes full width at the top (1080x608), fades into a dark brand panel, and the
// panel carries the tag pill, the headline (key words in the brand orange), the photo credit
// and the Film My Run logo and URL. Rendered with resvg and the fonts bundled in assets/fonts
// (Space Grotesk for display, Inter for text, as on filmmyrun.com), never system fonts, and
// every line of text is measured, so nothing clips.
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { SocialTag } from './tag';

export const CARD_W = 1080;
export const CARD_H = 1350;
const PHOTO_H = 608; // 1080 / (1200 / 675), the stored photo's own shape
const MARGIN = 72;
const TEXT_W = CARD_W - 2 * MARGIN;

/** filmmyrun.com's colours (src/styles/globals.css, docs/design-system.md). */
export const CARD_COLOURS = {
  brand: '#f88c00', // --color-brand, the orange
  background: '#09090b', // dark mode page background
  text: '#fafafa',
  muted: '#a1a1aa',
  border: '#27272a',
  breaking: '#ef4444', // --color-error: BREAKING gets red, the other tags orange
} as const;

const DISPLAY = 'Space Grotesk';
const TEXT = 'Inter';
const FONT_DIR = path.join(process.cwd(), 'assets/fonts');
const FONT_FILES = ['SpaceGrotesk-Bold.ttf', 'Inter-Regular.ttf', 'Inter-Medium.ttf'].map((f) => path.join(FONT_DIR, f));
const LOGO = path.join(process.cwd(), 'public/images/logo/fmr-logo-dark.png'); // 1000x444

const resvgOpts = { font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: TEXT } };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

const widths = new Map<string, number>();
/** The rendered width of one line of text in px, from resvg itself with the bundled font. */
export function textWidth(text: string, family: string, weight: number, size: number, letterSpacing = 0): number {
  const key = `${family}|${weight}|${size}|${letterSpacing}|${text}`;
  const hit = widths.get(key);
  if (hit !== undefined) return hit;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="${size * 3}"><text x="10" y="${size * 2}" font-family="${family}" font-weight="${weight}" font-size="${size}" letter-spacing="${letterSpacing}">${esc(text)}</text></svg>`;
  const w = new Resvg(svg, resvgOpts).getBBox()?.width ?? 0;
  widths.set(key, w);
  return w;
}

/** Text cut to fit `maxW`, with an ellipsis when it had to be cut. */
function fitLine(text: string, family: string, weight: number, size: number, maxW: number): string {
  if (textWidth(text, family, weight, size) <= maxW) return text;
  let t = text;
  while (t.length > 1 && textWidth(`${t}…`, family, weight, size) > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export const HEADLINE_SIZES = [100, 92, 84, 78, 72, 66, 60, 56];
export const HEADLINE_MAX_LINES = 4;
const LINE_HEIGHT = 1.06;

/**
 * Wrap the headline at the largest size that fits in `maxLines` lines of TEXT_W and `maxH`
 * tall, each line measured (with 2% to spare). Long headlines get smaller type; one that
 * doesn't fit even at the smallest size has its last line cut with an ellipsis.
 */
export function layoutHeadline(headline: string, maxH: number, maxLines = HEADLINE_MAX_LINES): { size: number; lines: string[] } {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  const fits = (s: string, size: number) => textWidth(s, DISPLAY, 700, size) * 1.02 <= TEXT_W;
  const wrap = (size: number): string[] | null => {
    const lines: string[] = [];
    for (const w of words) {
      const last = lines[lines.length - 1];
      if (last !== undefined && fits(`${last} ${w}`, size)) lines[lines.length - 1] = `${last} ${w}`;
      else if (fits(w, size)) lines.push(w);
      else return null; // one word wider than the card at this size
    }
    return lines;
  };
  for (const size of HEADLINE_SIZES) {
    const lines = wrap(size);
    if (lines && lines.length <= maxLines && lines.length * size * LINE_HEIGHT <= maxH) return { size, lines };
  }
  // Still too long at the smallest size: keep what fits and end on an ellipsis.
  const size = HEADLINE_SIZES[HEADLINE_SIZES.length - 1];
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (fits(next, size)) { line = next; continue; }
    if (line) lines.push(line);
    line = w;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const kept = lines.slice(0, maxLines);
  kept[kept.length - 1] = fitLine(`${kept[kept.length - 1]}…`, DISPLAY, 700, size, TEXT_W / 1.02);
  return { size, lines: kept };
}

const wordKey = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export interface CardInput {
  /** The story photo (any format sharp reads), cropped to fill the top of the card. */
  photo: Buffer;
  headline: string;
  /** Headline words shown in the brand orange. */
  highlight: string[];
  tag: SocialTag;
  /** e.g. "Photo: Jane Smith / iRunFar". */
  credit: string | null;
}

/** The card as a 1080x1350 PNG. */
export async function renderCard(c: CardInput): Promise<Buffer> {
  const photo = await sharp(c.photo).rotate().resize(CARD_W, PHOTO_H, { fit: 'cover', position: 'attention' }).jpeg({ quality: 88 }).toBuffer();
  const logo = fs.readFileSync(LOGO).toString('base64');
  const C = CARD_COLOURS;

  // Tag pill, straddling the photo's bottom edge.
  const pillSize = 28;
  const pillSpacing = 3;
  const pillH = 56;
  const pillW = Math.ceil(textWidth(c.tag, DISPLAY, 700, pillSize, pillSpacing)) + 2 * 28;
  const pillY = PHOTO_H - pillH / 2;
  const pillFill = c.tag === 'BREAKING' ? C.breaking : C.brand;
  const pillText = c.tag === 'BREAKING' ? C.text : C.background;

  // Footer, from the bottom up: orange rule, logo + URL, divider, photo credit.
  const logoH = 60;
  const logoW = Math.round((logoH * 1000) / 444);
  const logoY = CARD_H - 40 - logoH - 34;
  const dividerY = logoY - 34;
  const creditY = dividerY - 30;
  const credit = c.credit ? fitLine(c.credit, TEXT, 400, 24, TEXT_W) : '';

  // Headline between the pill and the credit.
  const headTop = pillY + pillH + 52;
  const headBottom = (credit ? creditY - 24 : dividerY) - 44;
  const { size, lines } = layoutHeadline(c.headline, headBottom - headTop);
  const hl = new Set(c.highlight.map(wordKey).filter(Boolean));
  const lineH = size * LINE_HEIGHT;
  const headSvg = lines
    .map((line, i) => {
      const spans = line.split(' ').map((w) => `<tspan fill="${hl.has(wordKey(w)) ? C.brand : C.text}">${esc(w)}</tspan>`).join(' ');
      return `<text x="${MARGIN}" y="${(headTop + size * 0.78 + i * lineH).toFixed(1)}" font-family="${DISPLAY}" font-weight="700" font-size="${size}">${spans}</text>`;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.background}" stop-opacity="0"/>
      <stop offset="0.65" stop-color="${C.background}" stop-opacity="0.7"/>
      <stop offset="1" stop-color="${C.background}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="${C.background}"/>
  <image x="0" y="0" width="${CARD_W}" height="${PHOTO_H}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${photo.toString('base64')}"/>
  <rect x="0" y="${PHOTO_H - 240}" width="${CARD_W}" height="241" fill="url(#fade)"/>
  <rect x="${MARGIN}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${pillFill}"/>
  <text x="${MARGIN + pillW / 2}" y="${pillY + pillH / 2 + pillSize * 0.36}" text-anchor="middle" font-family="${DISPLAY}" font-weight="700" font-size="${pillSize}" letter-spacing="${pillSpacing}" fill="${pillText}">${esc(c.tag)}</text>
  ${headSvg}
  ${credit ? `<text x="${MARGIN}" y="${creditY}" font-family="${TEXT}" font-weight="400" font-size="24" fill="${C.muted}">${esc(credit)}</text>` : ''}
  <rect x="${MARGIN}" y="${dividerY}" width="${TEXT_W}" height="2" fill="${C.border}"/>
  <image x="${MARGIN}" y="${logoY}" width="${logoW}" height="${logoH}" xlink:href="data:image/png;base64,${logo}"/>
  <text x="${CARD_W - MARGIN}" y="${logoY + logoH / 2 + 11}" text-anchor="end" font-family="${TEXT}" font-weight="500" font-size="32" fill="${C.text}">filmmyrun.com</text>
  <rect x="0" y="${CARD_H - 10}" width="${CARD_W}" height="10" fill="${C.brand}"/>
</svg>`;
  return Buffer.from(new Resvg(svg, { ...resvgOpts, fitTo: { mode: 'original' } }).render().asPng());
}

/**
 * The card as Meta gets it. Instagram's publishing API takes JPEG only (a PNG image_url
 * fails), so the PNG is re-encoded at high quality with full colour detail for the text.
 */
export async function cardJpeg(png: Buffer): Promise<Buffer> {
  return sharp(png).jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer();
}
