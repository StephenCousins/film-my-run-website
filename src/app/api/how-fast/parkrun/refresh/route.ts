import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  validateAthleteId,
  fetchParkrunPage,
  parseAthletePage,
  storeNewResults,
  getStoredResults,
  calculateStatsFromStoredResults,
  recalculatePBs,
  updateAthleteSummary,
} from '@/lib/how-fast/parkrun-scraper';

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
    // Scrape the full "all results" page
    const html = await fetchParkrunPage(id);
    const { name, results, error: parseError } = parseAthletePage(html);

    if (parseError) {
      return NextResponse.json({ ok: false, error: parseError }, { status: 500 });
    }

    if (!results.length) {
      return NextResponse.json({ ok: false, error: 'No results found' }, { status: 404 });
    }

    // Store new results (skipDuplicates)
    const newCount = await storeNewResults(id, results);

    // If new results found, recalculate PBs and stats
    if (newCount > 0) {
      await recalculatePBs(id);
    }

    // Get all stored results and recalculate stats
    const storedResults = await getStoredResults(id);
    const stats = calculateStatsFromStoredResults(
      storedResults.map(r => ({
        time_seconds: r.time_seconds,
        event: r.event,
        run_date: r.run_date,
        age_grade: r.age_grade,
        pb: r.pb,
      }))
    );

    if (stats) {
      await updateAthleteSummary(id, name, stats, results);
    }

    // Update results_scraped_at
    await prisma.parkrun_athletes.update({
      where: { athlete_id: id },
      data: { results_scraped_at: new Date(), updated_at: new Date() },
    }).catch(() => {}); // May not exist yet if first scrape failed somehow

    return NextResponse.json({
      ok: true,
      newResults: newCount,
      totalResults: storedResults.length,
    });
  } catch (error) {
    console.error('Parkrun refresh error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Refresh failed' },
      { status: 500 }
    );
  }
}
