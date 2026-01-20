import { NextRequest, NextResponse } from 'next/server';
import { getUKRankings } from '@/lib/parkrun-db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;

    const data = await getUKRankings(search);

    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (error) {
    console.error('Error fetching parkrun rankings:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rankings',
      },
      { status: 500 }
    );
  }
}
