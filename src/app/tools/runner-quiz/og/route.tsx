import { ImageResponse } from 'next/og';
import { findClosestIdeology } from '../quiz-data';

export const runtime = 'edge';

function MiniBar({ leftPct, leftColor, rightColor }: { leftPct: number; leftColor: string; rightColor: string }) {
  const l = Math.round(leftPct);
  return (
    <div style={{ display: 'flex', width: '100%', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', width: `${l}%`, height: '100%', backgroundColor: leftColor }} />
      <div style={{ display: 'flex', width: `${100 - l}%`, height: '100%', backgroundColor: rightColor }} />
    </div>
  );
}

function AxisRow({ label, leftLabel, rightLabel, leftPct, leftColor, rightColor }: {
  label: string; leftLabel: string; rightLabel: string; leftPct: number; leftColor: string; rightColor: string;
}) {
  const dominant = leftPct >= 50 ? 'left' : 'right';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: dominant === 'left' ? leftColor : '#52525b' }}>
          {leftLabel}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
          {label}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: dominant === 'right' ? rightColor : '#52525b' }}>
          {rightLabel}
        </span>
      </div>
      <MiniBar leftPct={leftPct} leftColor={leftColor} rightColor={rightColor} />
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const r = searchParams.get('r');

  let isResult = false;
  let tribeName = '';
  let tribeDesc = '';
  let scores = { surfaceL: 50, methodL: 50, distanceL: 50, spiritL: 50 };

  if (r) {
    const parts = r.split('-').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n) && n >= 0 && n <= 100)) {
      scores = { surfaceL: parts[0], methodL: parts[1], distanceL: parts[2], spiritL: parts[3] };
      const ideology = findClosestIdeology(scores.surfaceL, scores.methodL, scores.distanceL, scores.spiritL);
      tribeName = ideology.name;
      tribeDesc = ideology.desc;
      isResult = true;
    }
  }

  if (isResult) {
    return new ImageResponse(
      (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#09090b',
          fontFamily: 'Inter, system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background glow */}
          <div style={{
            display: 'flex',
            position: 'absolute',
            top: '-200px',
            right: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(248,140,0,0.15) 0%, transparent 70%)',
          }} />
          <div style={{
            display: 'flex',
            position: 'absolute',
            bottom: '-150px',
            left: '-50px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(248,140,0,0.08) 0%, transparent 70%)',
          }} />

          {/* Orange stripe */}
          <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, #f88c00, #ff9f1c, #f88c00)' }} />

          {/* Content */}
          <div style={{ display: 'flex', flex: 1, padding: '50px 60px 40px', position: 'relative' }}>

            {/* Left: Text */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', paddingRight: '40px' }}>

              {/* Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f88c00' }} />
                <span style={{ color: '#f88c00', fontSize: '13px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const }}>
                  I took the quiz. I&apos;m
                </span>
              </div>

              {/* Tribe name */}
              <span style={{ color: '#f88c00', fontSize: '28px', fontStyle: 'italic', fontWeight: 500, marginBottom: '2px' }}>
                The
              </span>
              <span style={{
                color: '#fafafa',
                fontSize: '72px',
                fontWeight: 900,
                lineHeight: 0.95,
                textTransform: 'uppercase' as const,
                letterSpacing: '-1px',
                marginBottom: '20px',
              }}>
                {tribeName}
              </span>

              {/* Description */}
              <span style={{
                color: '#a1a1aa',
                fontSize: '18px',
                lineHeight: 1.5,
                maxWidth: '500px',
              }}>
                {tribeDesc.length > 140 ? tribeDesc.slice(0, 137) + '...' : tribeDesc}
              </span>
            </div>

            {/* Right: Axis bars */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: '340px',
              gap: '16px',
              padding: '24px 28px',
              backgroundColor: '#18181b',
              borderRadius: '16px',
              border: '1px solid #27272a',
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#71717a', marginBottom: '4px' }}>
                My running DNA
              </span>
              <AxisRow label="Surface" leftLabel="Road" rightLabel="Trail" leftPct={scores.surfaceL} leftColor="#fafafa" rightColor="#f88c00" />
              <AxisRow label="Method" leftLabel="Data" rightLabel="Feel" leftPct={scores.methodL} leftColor="#3b82f6" rightColor="#f59e0b" />
              <AxisRow label="Distance" leftLabel="Speed" rightLabel="Ultra" leftPct={scores.distanceL} leftColor="#ef4444" rightColor="#8b5cf6" />
              <AxisRow label="Spirit" leftLabel="Race" rightLabel="Community" leftPct={scores.spiritL} leftColor="#eab308" rightColor="#14b8a6" />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 60px 28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f88c00', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900 }}>F</span>
              </div>
              <span style={{ color: '#52525b', fontSize: '15px', fontWeight: 600 }}>
                filmmyrun.com
              </span>
            </div>
            <div style={{
              display: 'flex',
              padding: '8px 20px',
              backgroundColor: '#f88c00',
              borderRadius: '999px',
            }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
                What kind of runner are you?
              </span>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  // Default: quiz promo card (no result)
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#09090b',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glows */}
        <div style={{
          display: 'flex',
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(248,140,0,0.12) 0%, transparent 70%)',
        }} />

        {/* Decorative axis dots - top right */}
        <div style={{ display: 'flex', position: 'absolute', top: '60px', right: '70px', gap: '12px', flexDirection: 'column' }}>
          {[
            { label: 'SURFACE', left: '#fafafa', right: '#f88c00' },
            { label: 'METHOD', left: '#3b82f6', right: '#f59e0b' },
            { label: 'DISTANCE', left: '#ef4444', right: '#8b5cf6' },
            { label: 'SPIRIT', left: '#eab308', right: '#14b8a6' },
          ].map((axis) => (
            <div key={axis.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', width: '120px', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', width: '50%', height: '100%', backgroundColor: axis.left, opacity: 0.6 }} />
                <div style={{ display: 'flex', width: '50%', height: '100%', backgroundColor: axis.right, opacity: 0.6 }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#3f3f46' }}>
                {axis.label}
              </span>
            </div>
          ))}
        </div>

        {/* Orange stripe */}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, #f88c00, #ff9f1c, #f88c00)' }} />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, padding: '50px 70px' }}>

          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            backgroundColor: 'rgba(248,140,0,0.12)',
            borderRadius: '999px',
            border: '1px solid rgba(248,140,0,0.25)',
            alignSelf: 'flex-start',
            marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f88c00' }} />
            <span style={{ color: '#f88c00', fontSize: '14px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const }}>
              Runner Ideology Quiz
            </span>
          </div>

          {/* Title */}
          <span style={{
            color: '#fafafa',
            fontSize: '80px',
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: '-2px',
            maxWidth: '700px',
            marginBottom: '8px',
          }}>
            What kind of
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '28px' }}>
            <span style={{
              color: '#fafafa',
              fontSize: '80px',
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: '-2px',
            }}>
              runner are
            </span>
            <span style={{
              color: '#f88c00',
              fontSize: '80px',
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 0.95,
            }}>
              you
            </span>
            <span style={{
              color: '#f88c00',
              fontSize: '80px',
              fontWeight: 900,
              lineHeight: 0.95,
            }}>
              ?
            </span>
          </div>

          {/* Subtitle */}
          <span style={{ color: '#71717a', fontSize: '22px', lineHeight: 1.5, maxWidth: '550px' }}>
            32 questions. 4 axes. 21 tribes. Find your running ideology in five minutes.
          </span>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 70px 32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f88c00', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900 }}>F</span>
            </div>
            <span style={{ color: '#52525b', fontSize: '15px', fontWeight: 600 }}>
              filmmyrun.com
            </span>
          </div>
          <div style={{
            display: 'flex',
            padding: '10px 24px',
            backgroundColor: '#f88c00',
            borderRadius: '999px',
          }}>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
              Take the quiz
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
