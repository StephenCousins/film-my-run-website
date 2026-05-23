import { ImageResponse } from 'next/og';
import { findClosestIdeology } from '../quiz-data';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const r = searchParams.get('r');

  let tribeName = 'What Kind of Runner Are You?';
  let tribeDesc = '32 questions, 4 axes, 21 tribes. Find your running ideology in five minutes.';
  let isResult = false;

  if (r) {
    const parts = r.split('-').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n) && n >= 0 && n <= 100)) {
      const [surfaceL, methodL, distanceL, spiritL] = parts;
      const ideology = findClosestIdeology(surfaceL, methodL, distanceL, spiritL);
      tribeName = ideology.name;
      tribeDesc = ideology.desc;
      isResult = true;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#09090b',
          padding: '60px 70px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Orange stripe */}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: '6px', backgroundColor: '#f88c00' }} />

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f88c0030', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#f88c00' }} />
          </div>
          <span style={{ color: '#f88c00', fontSize: '20px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
            {isResult ? 'My Running Tribe' : 'Runner Quiz'}
          </span>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', width: '100%', height: '1px', backgroundColor: '#27272a', marginBottom: '32px' }} />

        {/* The / Tribe name */}
        {isResult && (
          <span style={{ color: '#f88c00', fontSize: '36px', fontStyle: 'italic', fontWeight: 500, marginBottom: '4px' }}>
            The
          </span>
        )}
        <span style={{
          color: '#fafafa',
          fontSize: isResult ? '96px' : '72px',
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: '28px',
          textTransform: 'uppercase' as const,
          letterSpacing: '-1px',
        }}>
          {tribeName}
        </span>

        {/* Description */}
        <span style={{
          color: '#a1a1aa',
          fontSize: '24px',
          lineHeight: 1.5,
          maxWidth: '900px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}>
          {tribeDesc}
        </span>

        {/* Footer */}
        <div style={{ display: 'flex', marginTop: 'auto', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#f88c00', fontSize: '22px', fontWeight: 700 }}>
              filmmyrun.co.uk/tools/runner-quiz
            </span>
            <span style={{ color: '#71717a', fontSize: '16px' }}>
              {isResult ? 'Take the quiz — what kind of runner are you?' : 'Find your running tribe in 5 minutes'}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
