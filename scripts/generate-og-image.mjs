#!/usr/bin/env node
// Builds public/og-image.jpg, the site-wide social share image (1200x630).
//
//   node scripts/generate-og-image.mjs
//
// Background: the home hero still (Transgrancanaria 2020), cover-cropped, with a
// dark left-to-right gradient so the text reads. On top: the light logo, the
// site name, the tagline and the domain with a brand-orange accent.
// Text is rendered by sharp (Pango) from the TTFs in public/fonts/runner-quiz,
// so the output does not depend on whatever fonts the machine has installed.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => path.join(root, ...parts);

const WIDTH = 1200;
const HEIGHT = 630;
const ORANGE = '#f97316';
const LEFT = 72;

const BACKGROUND = p('public/images/hero/transgrancanaria2020.jpg');
const LOGO = p('public/images/logo/fmr-logo-light.png');
const FONT_BOLD = p('public/fonts/runner-quiz/SpaceGrotesk-Bold.ttf');
const FONT_MEDIUM = p('public/fonts/runner-quiz/Inter-Medium.ttf');
const OUT = p('public/og-image.jpg');

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Render one line of text to a transparent PNG buffer.
async function textLayer({ text, fontfile, family, size, color }) {
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${color}">${escape(text)}</span>`,
      font: `${family} ${size}`,
      fontfile,
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

async function main() {
  const background = await sharp(BACKGROUND)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
    .toBuffer();

  // Dark gradient: heavy on the left where the text sits, lighter over the runner,
  // plus a bottom fade.
  const overlay = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0.88"/>
          <stop offset="0.45" stop-color="#000" stop-opacity="0.7"/>
          <stop offset="0.75" stop-color="#000" stop-opacity="0.25"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.1"/>
        </linearGradient>
        <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#h)"/>
      <rect width="100%" height="100%" fill="url(#v)"/>
      <rect x="0" y="${HEIGHT - 10}" width="${WIDTH}" height="10" fill="${ORANGE}"/>
    </svg>`);

  const logoWidth = 300;
  const logo = await sharp(LOGO).resize({ width: logoWidth }).png().toBuffer();
  const logoHeight = Math.round((444 / 1000) * logoWidth);

  const title = await textLayer({
    text: 'Film My Run',
    fontfile: FONT_BOLD,
    family: 'Space Grotesk Bold',
    size: 84,
    color: '#ffffff',
  });
  const tagline = await textLayer({
    text: 'Documentary Filmmaker & Ultra Runner',
    fontfile: FONT_MEDIUM,
    family: 'Inter Medium',
    size: 34,
    color: '#e4e4e7',
  });
  const domain = await textLayer({
    text: 'filmmyrun.com',
    fontfile: FONT_BOLD,
    family: 'Space Grotesk Bold',
    size: 36,
    color: ORANGE,
  });

  const logoTop = 64;
  const titleTop = logoTop + logoHeight + 44;
  const taglineTop = titleTop + title.height + 12;
  const barTop = taglineTop + tagline.height + 40;
  const domainTop = HEIGHT - 64 - domain.height;

  for (const [name, layer, top] of [
    ['title', title, titleTop],
    ['tagline', tagline, taglineTop],
    ['domain', domain, domainTop],
  ]) {
    if (LEFT + layer.width > WIDTH - 40 || top + layer.height > HEIGHT - 20) {
      throw new Error(`${name} does not fit (${layer.width}x${layer.height} at ${top})`);
    }
  }

  const accentBar = Buffer.from(
    `<svg width="96" height="6" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="6" rx="3" fill="${ORANGE}"/></svg>`,
  );

  await sharp(background)
    .composite([
      { input: overlay, top: 0, left: 0 },
      { input: logo, top: logoTop, left: LEFT },
      { input: title.input, top: titleTop, left: LEFT },
      { input: tagline.input, top: taglineTop, left: LEFT },
      { input: accentBar, top: Math.min(barTop, domainTop - 30), left: LEFT },
      { input: domain.input, top: domainTop, left: LEFT },
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  const { size } = await import('node:fs').then((fs) => fs.promises.stat(OUT));
  console.log(`Wrote ${path.relative(root, OUT)}: ${meta.width}x${meta.height}, ${Math.round(size / 1024)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
