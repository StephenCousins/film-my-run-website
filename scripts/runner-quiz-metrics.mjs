// One-off: advance widths (in em) for the runner quiz shirt fonts, so the client
// preview and the server print measure text identically without canvas or DOM.
// Run: node scripts/runner-quiz-metrics.mjs
import fs from 'node:fs';
import opentype from 'opentype.js';

const FONTS = ['SpaceGrotesk-Bold', 'JetBrainsMono-Medium', 'JetBrainsMono-Bold', 'Inter-Regular', 'Inter-Medium'];
// Printable ASCII plus the middle dot and curly quotes the art or content might use.
const CHARS = [...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)), '·', '‘', '’', '“', '”'];

const out = {};
for (const name of FONTS) {
  const buf = fs.readFileSync(`assets/fonts/${name}.ttf`);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  out[name] = Object.fromEntries(
    CHARS.map((c) => [c, Math.round((font.charToGlyph(c).advanceWidth / font.unitsPerEm) * 10000) / 10000])
  );
}
fs.writeFileSync('src/lib/runner-quiz/metrics.json', JSON.stringify(out, null, 1) + '\n');
console.log('wrote src/lib/runner-quiz/metrics.json');
