// Server only: renders shirt art to a print PNG with the bundled fonts.
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { PRINT_W, type ShirtColour } from './shirt-art';

const FONT_DIR = path.join(process.cwd(), 'assets/fonts');
// Read on first render, not at import: the Stripe webhook imports this file for every order.
let fontFiles: string[] | undefined;
const fonts = () =>
  (fontFiles ??= fs.readdirSync(FONT_DIR).filter((f) => f.endsWith('.ttf')).map((f) => path.join(FONT_DIR, f)));

/**
 * SVG → PNG, transparent background. Default is the art's own size (3709 × 4203, Printify's
 * print area for size S); pass 4500 for the L-4XL area (4500 × 5100, same shape).
 */
export async function renderPng(svg: string, width = PRINT_W): Promise<Buffer> {
  const resvg = new Resvg(svg, {
    font: { fontFiles: fonts(), loadSystemFonts: false, defaultFontFamily: 'Inter' },
    fitTo: { mode: 'width', value: width },
  });
  return resvg.render().asPng();
}

/** The Film My Run logo as a data URI, for backArt: dark runners on White, white runners otherwise. */
export function logoDataUri(colour: ShirtColour): string {
  const file = colour === 'White' ? 'fmr-logo-light.png' : 'fmr-logo-dark.png';
  const png = fs.readFileSync(path.join(process.cwd(), 'public/images/logo', file));
  return `data:image/png;base64,${png.toString('base64')}`;
}
