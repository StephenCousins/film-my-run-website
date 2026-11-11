import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

// RunGuessr's share card (11 Nov 2026): the name over an elevation profile, the share grid beside it.
export const runtime = 'nodejs';

let fontData: Promise<Buffer> | null = null;
const spaceGrotesk = () => (fontData ??= fs.readFile(path.join(process.cwd(), 'assets/fonts/SpaceGrotesk-Bold.ttf')));

// A made-up but plausible mountain ultra profile, 0..1.
const PROFILE = [0.1, 0.14, 0.3, 0.55, 0.62, 0.48, 0.35, 0.4, 0.72, 0.9, 0.84, 0.6, 0.42, 0.46, 0.66, 0.78, 0.7, 0.5, 0.3, 0.22, 0.12];

export async function GET() {
  const font = await spaceGrotesk();
  const W = 1200, H = 260;
  const pts = PROFILE.map((v, i) => `${(i * W) / (PROFILE.length - 1)},${H - v * H}`).join(' ');
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', backgroundColor: '#09090b', color: '#fafafa', fontFamily: 'Space Grotesk', position: 'relative' }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, bottom: 0 }}>
          <polygon points={`0,${H} ${pts} ${W},${H}`} fill="rgba(248,140,0,0.18)" />
          <polyline points={pts} fill="none" stroke="#f88c00" strokeWidth="6" strokeLinejoin="round" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '64px 72px 0' }}>
          <div style={{ display: 'flex', color: '#f88c00', fontSize: 24, letterSpacing: 4, textTransform: 'uppercase' }}>Daily race quiz</div>
          <div style={{ display: 'flex', fontSize: 132, fontWeight: 700, marginTop: 8, letterSpacing: -3 }}>RunGuessr</div>
          <div style={{ display: 'flex', fontSize: 36, color: '#a1a1aa', marginTop: 8 }}>Which race is this? Five a day.</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 72px 48px' }}>
          <div style={{ display: 'flex', fontSize: 56 }}>🟩🟩🟨🟥🟩</div>
          <div style={{ display: 'flex', fontSize: 24, color: '#fafafa' }}>filmmyrun.com/games/runguessr</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: 'Space Grotesk', data: font, weight: 700, style: 'normal' }] }
  );
}
