import { ImageResponse } from 'next/og';
import { sharedType } from '@/lib/runner-quiz';

export const runtime = 'edge';

// Share card: the type's shirt phrase big, the type name under it. No `r`: the quiz itself.
export async function GET(request: Request) {
  const type = sharedType(new URL(request.url).searchParams.get('r'));
  const font = await fetch(new URL('/fonts/runner-quiz/SpaceGrotesk-Bold.ttf', request.url))
    .then((res) => (res.ok ? res.arrayBuffer() : null))
    .catch(() => null);

  const lines = type ? type.shirtLines : ['WHAT KIND OF', 'RUNNER ARE YOU?'];
  const size = lines.length > 3 ? 76 : lines.length > 2 ? 96 : 116;
  const accent = type?.colour ?? '#f88c00';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '64px 72px',
          backgroundColor: '#09090b',
          color: '#fafafa',
          fontFamily: font ? 'Space Grotesk' : 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', color: '#f88c00', fontSize: 22, letterSpacing: 4, textTransform: 'uppercase' }}>
          {type ? 'My runner type' : 'Runner quiz'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {lines.map((l) => (
            <div key={l} style={{ display: 'flex', fontSize: size, fontWeight: 700, lineHeight: 1.02, letterSpacing: -1 }}>
              {l}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 28 }}>
            <div style={{ display: 'flex', width: 64, height: 8, borderRadius: 4, backgroundColor: accent, marginRight: 20 }} />
            <div style={{ display: 'flex', fontSize: 32, color: '#a1a1aa', letterSpacing: 3, textTransform: 'uppercase' }}>
              {type ? type.name : 'Twelve questions. Two minutes.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: '#71717a' }}>
          <span>What kind of runner are you?</span>
          <span style={{ color: '#f88c00' }}>filmmyrun.com</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: 'Space Grotesk', data: font, weight: 700, style: 'normal' }] : undefined,
    }
  );
}
