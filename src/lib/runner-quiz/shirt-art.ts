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
export const FRONT_MAX_WIDTH = PRINT_W * 0.64;
const FRONT_CAP = 410;
const FRONT_SPACING = 0.023; // em, as the mock-up's 0.6 at 26

export function frontArt(t: QuizType, colour: ShirtColour): string {
  const { ink, tint } = palette(colour);
  const lines = t.shirtLines;
  const size = Math.min(...lines.map((l) => fit(l, 'SpaceGrotesk-Bold', FRONT_CAP, FRONT_MAX_WIDTH, FRONT_SPACING)));
  const gap = size * 1.12;
  const nameSize = 126;
  const blockH = size * 0.72 + (lines.length - 1) * gap + size * 0.9 + 94 + 251;
  // Centre the block on the chest, 30% of the way down the print area.
  const top = Math.max(160, PRINT_H * 0.3 - blockH / 2) + size * 0.72;
  const cx = PRINT_W / 2;
  const text = lines
    .map(
      (l, i) =>
        `<text x="${cx}" y="${f(top + i * gap)}" text-anchor="middle" ${FONT['SpaceGrotesk-Bold']} font-size="${f(size)}" letter-spacing="${f(size * FRONT_SPACING)}" fill="${ink}">${esc(l)}</text>`
    )
    .join('');
  const y = top + (lines.length - 1) * gap + size * 0.9 + 94;
  return svg(
    `${text}<line x1="${cx - 250}" x2="${cx + 250}" y1="${f(y)}" y2="${f(y)}" stroke="${t.colour}" stroke-width="40"/>` +
      `<text x="${cx}" y="${f(y + 251)}" text-anchor="middle" ${FONT['JetBrainsMono-Medium']} font-size="${nameSize}" letter-spacing="31" fill="${tint(0.75)}">${esc(upperName(t.name))}</text>`
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
 * Back: logo, RUNNER DNA, the type name, four scales with the buyer's scores, their
 * second type and the date. Drawn in the mock-up's 400-wide units, then scaled so the
 * block fills the height of the print area.
 */
const BACK_K = 11; // px per mock-up unit
const BACK_TOP = 40; // mock-up y that sits at the top of the print area
// The scales run 120-280 with the score hanging to the right (widest "100"); shift them so
// that whole row, number included, is centred on the print.
const ROWS_SHIFT = 200 - (120 + 292 + textWidth('100', 'JetBrainsMono-Bold', 11)) / 2;
// Logo ~18% of the print width (Stephen, 29 Sep: smaller than the mock-up's 80); the block below moves up with it.
const LOGO_W = (PRINT_W * 0.18) / BACK_K;
const LOGO_H = LOGO_W / 2.2523; // logo PNGs are 1000 × 444

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
  const nameSize = fit(name, 'SpaceGrotesk-Bold', 22, 220);
  const streak = `with a streak of ${second.name}`;
  const streakSize = fit(streak, 'Inter-Regular', 10.5, 230);
  // Last guard before print: only four whole numbers 0-100 reach the shirt.
  if (!Array.isArray(scores) || scores.length !== 4 || !scores.every((v) => Number.isInteger(v) && v >= 0 && v <= 100)) {
    throw new Error('Invalid scores for shirt art');
  }
  const rows = LABELS.map(([lo, hi], k) => {
    const s = scores[k];
    const y = 170 + k * 50,
      x0 = 120,
      w = 160,
      x = x0 + (w * s) / 100;
    return (
      `<text x="${x0}" y="${y - 10}" ${mono} font-size="8.5" letter-spacing="1" fill="${tint(0.7)}">${lo}</text>` +
      `<text x="${x0 + w}" y="${y - 10}" text-anchor="end" ${mono} font-size="8.5" letter-spacing="1" fill="${tint(0.7)}">${hi}</text>` +
      `<rect x="${x0}" y="${y - 2}" width="${w}" height="4" rx="2" fill="${tint(0.25)}"/>` +
      `<circle cx="${f(x)}" cy="${y}" r="7" fill="${t.colour}" stroke="${ink}" stroke-width="1.5"/>` +
      `<text x="${x0 + w + 12}" y="${y + 4}" ${FONT['JetBrainsMono-Bold']} font-size="11" fill="${ink}">${s}</text>`
    );
  }).join('');
  const tx = PRINT_W / 2 - 200 * BACK_K;
  return svg(
    `<g transform="translate(${f(tx)} ${-BACK_TOP * BACK_K}) scale(${BACK_K})">` +
      `<image href="${esc(logoHref)}" xlink:href="${esc(logoHref)}" x="${f(200 - LOGO_W / 2)}" y="46" width="${f(LOGO_W)}" height="${f(LOGO_H)}"/>` +
      `<g transform="translate(0 ${f(LOGO_H - 35.5)})">` +
      `<text x="200" y="104" text-anchor="middle" ${mono} font-size="9" letter-spacing="3" fill="${tint(0.75)}">RUNNER DNA</text>` +
      `<text x="200" y="134" text-anchor="middle" ${FONT['SpaceGrotesk-Bold']} font-size="${f(nameSize)}" fill="${ink}">${esc(name)}</text>` +
      `<g transform="translate(${f(ROWS_SHIFT)} 0)">${rows}</g>` +
      `<text x="200" y="376" text-anchor="middle" ${FONT['Inter-Regular']} font-size="${f(streakSize)}" fill="${tint(0.85)}">${esc(streak)}</text>` +
      `<text x="200" y="396" text-anchor="middle" ${mono} font-size="8" letter-spacing="1.5" fill="${tint(0.6)}">FILMMYRUN.COM/QUIZ · ${formatDate(date)}</text>` +
      `</g></g>`
  );
}

/** Where the print area sits on the 400 × 440 garment drawing (as Printify's placeholder). */
const MOCK_AREA = { x: 120, y: 72, w: 160 };

/** On-page preview: a T-shirt in `colourHex` with the art placed on it. */
export function teeMock(colourHex: string, artSvg: string): string {
  const h = (MOCK_AREA.w * PRINT_H) / PRINT_W;
  const art = artSvg.replace('<svg ', `<svg x="${MOCK_AREA.x}" y="${MOCK_AREA.y}" width="${MOCK_AREA.w}" height="${f(h)}" `);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 440" role="img" aria-label="T-shirt preview">
  <path d="M130 30 Q200 62 270 30 L352 64 Q370 72 376 92 L396 160 L336 182 L318 132 L318 420 Q200 432 82 420 L82 132 L64 182 L4 160 L24 92 Q30 72 48 64 Z" fill="${esc(colourHex)}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
  <path d="M150 34 Q200 60 250 34" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="3"/>
  ${art}</svg>`;
}
