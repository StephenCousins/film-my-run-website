import { NextRequest, NextResponse } from 'next/server';
import { fetchRunnerProfile } from '@/lib/stone-tracker/utmb';
import { computeStones } from '@/lib/stone-tracker/compute';

export async function GET(req: NextRequest) {
  const uri = (req.nextUrl.searchParams.get('uri') || '').trim();
  if (!uri) {
    return NextResponse.json({ error: 'Missing runner id' }, { status: 400 });
  }
  try {
    const profile = await fetchRunnerProfile(uri);
    const stones = computeStones(profile);
    return NextResponse.json({
      runner: {
        fullname: profile.fullname,
        nationalityCode: profile.nationalityCode,
        ageGroup: profile.ageGroup,
        gender: profile.gender,
      },
      indexes: profile.performanceIndexes,
      stones,
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not load this runner from UTMB. Please try again shortly.' },
      { status: 502 }
    );
  }
}
