import { NextRequest, NextResponse } from 'next/server';
import {
  validateAthleteId,
  fetchPo10Page,
  calculateOverallStats,
  updatePo10Summary,
} from '@/lib/how-fast/po10-scraper';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const athlete_id = body.id;

  const validation = validateAthleteId(athlete_id || '');
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const id = validation.sanitized!;

  try {
    // Scrape fresh PBs
    const data = await fetchPo10Page(id);

    if (data.error) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 500 });
    }

    if (Object.keys(data.pbs).length === 0) {
      return NextResponse.json({ ok: false, error: 'No personal bests found' }, { status: 404 });
    }

    const stats = calculateOverallStats(data.pbs, data.gender, data.age_group);

    // Update stored data
    await updatePo10Summary(id, data, stats);

    return NextResponse.json({
      ok: true,
      pbCount: Object.keys(data.pbs).length,
    });
  } catch (error) {
    console.error('PO10 refresh error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Refresh failed' },
      { status: 500 }
    );
  }
}
