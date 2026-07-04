import { NextRequest, NextResponse } from 'next/server';
import { searchRunners } from '@/lib/stone-tracker/utmb';

export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get('name') || '').trim();
  if (name.length < 2) {
    return NextResponse.json({ runners: [] });
  }
  try {
    const runners = await searchRunners(name);
    return NextResponse.json({ runners });
  } catch {
    return NextResponse.json(
      { error: 'UTMB search is unavailable right now. Please try again shortly.' },
      { status: 502 }
    );
  }
}
