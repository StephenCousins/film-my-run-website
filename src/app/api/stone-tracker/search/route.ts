import { NextRequest, NextResponse } from 'next/server';
import { searchRunners } from '@/lib/stone-tracker/utmb';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const name = (sp.get('name') || '').trim();
  if (name.length < 2) {
    return NextResponse.json({ runners: [], nbHits: 0 });
  }
  try {
    const result = await searchRunners(name, {
      nationality: sp.get('nationality') || undefined,
      sex: sp.get('sex') || undefined,
      ageGroup: sp.get('ageGroup') || undefined,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'UTMB search is unavailable right now. Please try again shortly.' },
      { status: 502 }
    );
  }
}
