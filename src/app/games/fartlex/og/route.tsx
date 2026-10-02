import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

// Fartlex's share card (2 Oct 2026): the name spelt in game tiles. Node, as the quiz card is,
// so the bundled font is read from disk rather than fetched from the site's own URL.
export const runtime = 'nodejs';

let fontData: Promise<Buffer> | null = null;
const spaceGrotesk = () => (fontData ??= fs.readFile(path.join(process.cwd(), 'assets/fonts/SpaceGrotesk-Bold.ttf')));

// The game's own colours: orange right place, blue wrong place, grey not in the word.
const TILES: [string, string][] = [['F', '#f88c00'], ['A', '#0284c7'], ['R', '#f88c00'], ['T', '#52525b'], ['L', '#f88c00'], ['E', '#0284c7'], ['X', '#f88c00']];

export async function GET() {
  const font = await spaceGrotesk();
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: '64px 72px', backgroundColor: '#09090b', color: '#fafafa', fontFamily: 'Space Grotesk' }}>
        <div style={{ display: 'flex', color: '#f88c00', fontSize: 22, letterSpacing: 4, textTransform: 'uppercase' }}>Daily running word game</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex' }}>
            {TILES.map(([ch, colour], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 132, height: 132, marginRight: 14, borderRadius: 14, backgroundColor: colour, fontSize: 84, fontWeight: 700, color: '#fafafa' }}>
                {ch}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 36, color: '#a1a1aa', marginTop: 36 }}>Speed play with words. A new running word every day.</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: '#71717a' }}>
          <span>Keep your run streak going</span>
          <span style={{ color: '#f88c00' }}>filmmyrun.com/games/fartlex</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: 'Space Grotesk', data: font, weight: 700, style: 'normal' }] }
  );
}
