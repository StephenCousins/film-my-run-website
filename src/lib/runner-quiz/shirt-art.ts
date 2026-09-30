// Runner quiz shirt art. The same SVG drives the on-page preview and the Printify
// print (rendered to PNG by render.ts), so what the buyer sees is what gets printed.
import metrics from './metrics.json';
import { upperName, type QuizType, type Scores } from './index';

/** Printify print area for blueprint 12 (front and back), in pixels. */
export const PRINT_W = 3709;
export const PRINT_H = 4203;

export const DARK_INK = '#18181b';
export const LIGHT_INK = '#f5f4ef';

export type FontName = keyof typeof metrics;

const FONT: Record<FontName, string> = {
  'SpaceGrotesk-Bold': `font-family="Space Grotesk" font-weight="700"`,
  'JetBrainsMono-Medium': `font-family="JetBrains Mono" font-weight="500"`,
  'JetBrainsMono-Bold': `font-family="JetBrains Mono" font-weight="700"`,
  'Inter-Regular': `font-family="Inter" font-weight="400"`,
  'Inter-Medium': `font-family="Inter" font-weight="500"`,
};

/** Width of `text` in px from the static advance-width table (no kerning). */
export function textWidth(text: string, font: FontName, size: number, letterSpacing = 0): number {
  const table = metrics[font] as Record<string, number>;
  return [...text].reduce((w, c) => w + (table[c] ?? table['M']) * size + letterSpacing, 0);
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The shirt colours on offer (Printify blueprint 12), as drawn in previews and used to mix muted ink. */
export const SHIRT_COLOURS = {
  Black: '#1c1c1e',
  'Dark Grey': '#4a4a4f',
  Forest: '#2e4636',
  Navy: '#1f2a44',
  White: '#f1f0ec',
} as const;
export type ShirtColour = keyof typeof SHIRT_COLOURS;

/** Ink for a shirt colour: dark on White, light on everything else. */
export const inkFor = (colour: ShirtColour) => (colour === 'White' ? DARK_INK : LIGHT_INK);

/** `a` laid over `b` at strength `t` (0-1), as one solid hex colour. */
export function mix(a: string, b: string, t: number): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return '#' + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}

// DTG must never get semi-transparent ink, so faded text is ink pre-mixed with the shirt colour.
function palette(colour: ShirtColour) {
  const ink = inkFor(colour);
  return { ink, tint: (t: number) => mix(ink, SHIRT_COLOURS[colour], t) };
}

const f = (n: number) => n.toFixed(1);
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${PRINT_W} ${PRINT_H}">${body}</svg>`;

// Font size so `text` is at most `max` wide, never above `cap`.
const fit = (text: string, font: FontName, cap: number, max: number, spacingEm = 0) =>
  Math.min(cap, (100 * max) / textWidth(text, font, 100, 100 * spacingEm));

/** Front: the phrase over the chest, a short rule in the type's colour, the type name. */
// Stephen, 30 Sep: bigger. The widest line fills up to 85% of the print width.
export const FRONT_MAX_WIDTH = PRINT_W * 0.85;
const FRONT_CAP = 580;
const FRONT_SPACING = 0.023; // em, as the mock-up's 0.6 at 26

export function frontArt(t: QuizType, colour: ShirtColour): string {
  const { ink, tint } = palette(colour);
  const lines = t.shirtLines;
  const size = Math.min(...lines.map((l) => fit(l, 'SpaceGrotesk-Bold', FRONT_CAP, FRONT_MAX_WIDTH, FRONT_SPACING)));
  const gap = size * 1.12;
  // The rule and the type name keep their proportion to the phrase (the old 410 px phrase had a 126 px name).
  const k = size / 410;
  const nameSize = 126 * k;
  const blockH = size * 0.72 + (lines.length - 1) * gap + size * 0.9 + 94 * k + 251 * k;
  // Centre the block on the chest, 30% of the way down the print area.
  const top = Math.max(160, PRINT_H * 0.3 - blockH / 2) + size * 0.72;
  const cx = PRINT_W / 2;
  const text = lines
    .map(
      (l, i) =>
        `<text x="${cx}" y="${f(top + i * gap)}" text-anchor="middle" ${FONT['SpaceGrotesk-Bold']} font-size="${f(size)}" letter-spacing="${f(size * FRONT_SPACING)}" fill="${ink}">${esc(l)}</text>`
    )
    .join('');
  const y = top + (lines.length - 1) * gap + size * 0.9 + 94 * k;
  return svg(
    `${text}<line x1="${f(cx - 250 * k)}" x2="${f(cx + 250 * k)}" y1="${f(y)}" y2="${f(y)}" stroke="${t.colour}" stroke-width="${f(40 * k)}"/>` +
      `<text x="${cx}" y="${f(y + 251 * k)}" text-anchor="middle" ${FONT['JetBrainsMono-Medium']} font-size="${f(nameSize)}" letter-spacing="${f(31 * k)}" fill="${tint(0.75)}">${esc(upperName(t.name))}</text>`
  );
}

const LABELS = [
  ['TRAIL', 'ROAD'],
  ['FEEL', 'DATA'],
  ['LONG', 'SHORT'],
  ['SOCIAL', 'RACER'],
];

const pad = (n: number) => String(n).padStart(2, '0');
/** DD.MM.YYYY in UK time. */
export function formatDate(date: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(date)
      .map((x) => [x.type, x.value])
  );
  return `${pad(+p.day)}.${pad(+p.month)}.${p.year}`;
}

/**
 * Back: logo, RUNNER DNA, the type name, four scales with the buyer's scores, their second
 * type and the date. Laid out in small units, then scaled so the block spans about 80% of the
 * print width and fills its height (Stephen, 30 Sep: bigger).
 */
const BACK_K = 14.5; // px per unit: 290 units tall fits the 4203 px print area
const BACK_CX = 200; // the unit x that lands on the print's centre line
const ROW_W = 170; // the scale bar
const NUM_W = textWidth('100', 'JetBrainsMono-Bold', 11); // the widest score, hanging right of the bar
// Bar plus score, centred on the print as one row.
const ROW_X0 = BACK_CX - (ROW_W + 12 + NUM_W) / 2;
// Logo at 20% of the print width, top centre.
const LOGO_W = (PRINT_W * 0.2) / BACK_K;
const LOGO_H = LOGO_W / 2.2523; // logo PNGs are 1000 × 444
const LOGO_Y = 8;
// Below the logo: RUNNER DNA at +16, the type name at +42, the first scale at +80, then every 40.
const ROWS_Y = 80;

export function backArt(
  t: QuizType,
  second: QuizType,
  scores: Scores,
  date: Date,
  colour: ShirtColour,
  logoHref: string
): string {
  const { ink, tint } = palette(colour);
  const mono = FONT['JetBrainsMono-Medium'];
  const name = upperName(t.name);
  const nameSize = fit(name, 'SpaceGrotesk-Bold', 22, 225);
  const streak = `with a streak of ${second.name}`;
  const streakSize = fit(streak, 'Inter-Regular', 10.5, 230);
  // Last guard before print: only four whole numbers 0-100 reach the shirt.
  if (!Array.isArray(scores) || scores.length !== 4 || !scores.every((v) => Number.isInteger(v) && v >= 0 && v <= 100)) {
    throw new Error('Invalid scores for shirt art');
  }
  const top = LOGO_Y + LOGO_H; // everything below the logo hangs from here
  const rows = LABELS.map(([lo, hi], k) => {
    const s = scores[k];
    const y = top + ROWS_Y + k * 40,
      x0 = ROW_X0,
      w = ROW_W,
      x = x0 + (w * s) / 100;
    return (
      `<text x="${f(x0)}" y="${f(y - 10)}" ${mono} font-size="8.5" letter-spacing="1" fill="${tint(0.7)}">${lo}</text>` +
      `<text x="${f(x0 + w)}" y="${f(y - 10)}" text-anchor="end" ${mono} font-size="8.5" letter-spacing="1" fill="${tint(0.7)}">${hi}</text>` +
      `<rect x="${f(x0)}" y="${f(y - 2)}" width="${w}" height="4" rx="2" fill="${tint(0.25)}"/>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="${t.colour}" stroke="${ink}" stroke-width="1.5"/>` +
      `<text x="${f(x0 + w + 12)}" y="${f(y + 4)}" ${FONT['JetBrainsMono-Bold']} font-size="11" fill="${ink}">${s}</text>`
    );
  }).join('');
  const tx = PRINT_W / 2 - BACK_CX * BACK_K;
  const text = (y: number, attrs: string, body: string) =>
    `<text x="${BACK_CX}" y="${f(top + y)}" text-anchor="middle" ${attrs}>${body}</text>`;
  return svg(
    `<g transform="translate(${f(tx)} 0) scale(${BACK_K})">` +
      `<image href="${esc(logoHref)}" xlink:href="${esc(logoHref)}" x="${f(BACK_CX - LOGO_W / 2)}" y="${LOGO_Y}" width="${f(LOGO_W)}" height="${f(LOGO_H)}"/>` +
      text(16, `${mono} font-size="9" letter-spacing="3" fill="${tint(0.75)}"`, 'RUNNER DNA') +
      text(42, `${FONT['SpaceGrotesk-Bold']} font-size="${f(nameSize)}" fill="${ink}"`, esc(name)) +
      rows +
      text(ROWS_Y + 3 * 40 + 32, `${FONT['Inter-Regular']} font-size="${f(streakSize)}" fill="${tint(0.85)}"`, esc(streak)) +
      text(ROWS_Y + 3 * 40 + 50, `${mono} font-size="8" letter-spacing="1.5" fill="${tint(0.6)}"`, `FILMMYRUN.COM/QUIZ · ${formatDate(date)}`) +
      `</g>`
  );
}

/**
 * Where the print area sits on the 400 × 440 garment drawing: 72% of the 236-unit chest (a
 * size L print area is 15 in on a 20 in chest), its top 3 in below the collar. Printify places
 * the art centred (x 0.5, y 0.5) at scale 0.9445 of that area, so the preview does the same.
 */
const MOCK_AREA = { x: 115, y: 62, w: 170 };
const PRINTIFY_SCALE = 0.9445;

/** On-page preview: a T-shirt in `colourHex` with the art placed on it, at its true size. */
export function teeMock(colourHex: string, artSvg: string): string {
  const areaH = (MOCK_AREA.w * PRINT_H) / PRINT_W;
  const w = MOCK_AREA.w * PRINTIFY_SCALE;
  const h = areaH * PRINTIFY_SCALE;
  const x = MOCK_AREA.x + (MOCK_AREA.w - w) / 2;
  const y = MOCK_AREA.y + (areaH - h) / 2;
  const art = artSvg.replace('<svg ', `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" `);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 440" role="img" aria-label="T-shirt preview">
  <path d="M130 30 Q200 62 270 30 L352 64 Q370 72 376 92 L396 160 L336 182 L318 132 L318 420 Q200 432 82 420 L82 132 L64 182 L4 160 L24 92 Q30 72 48 64 Z" fill="${esc(colourHex)}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
  <path d="M150 34 Q200 60 250 34" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="3"/>
  ${art}</svg>`;
}
