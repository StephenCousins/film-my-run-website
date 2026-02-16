import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  secondsToTimeStr,
  getFullComparison,
} from '@/lib/how-fast/comparisons';
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

const CACHE_HOURS = 6;

export async function GET(request: NextRequest) {
  const athlete_id = request.nextUrl.searchParams.get('id');

  const validation = validateAthleteId(athlete_id || '');
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const id = validation.sanitized!;

  try {
    // Check for existing athlete record
    const cached = await prisma.parkrun_athletes.findUnique({
      where: { athlete_id: id },
    });

    // If athlete exists in DB, return stored results instantly
    if (cached) {
      // Fetch all stored results from parkrun_results table
      const storedResults = await getStoredResults(id);

      if (storedResults.length > 0) {
        // Calculate stats from stored results
        const stats = calculateStatsFromStoredResults(
          storedResults.map(r => ({
            time_seconds: r.time_seconds,
            event: r.event,
            run_date: r.run_date,
            age_grade: r.age_grade,
            pb: r.pb,
          }))
        );

        // Determine if data needs refresh
        const scrapedAge = cached.results_scraped_at
          ? (Date.now() - new Date(cached.results_scraped_at).getTime()) / (1000 * 60 * 60)
          : Infinity;
        const needsRefresh = scrapedAge >= CACHE_HOURS;

        // Update lookup count (non-blocking)
        prisma.parkrun_athletes.update({
          where: { athlete_id: id },
          data: {
            lookup_count: { increment: 1 },
            last_lookup_at: new Date(),
          },
        }).catch(() => {});

        // Log lookup (non-blocking)
        prisma.athlete_lookups.create({
          data: {
            source: 'parkrun',
            athlete_id: id,
            athlete_name: cached.name,
          },
        }).catch(() => {});

        const comparison = stats
          ? getFullComparison(
              stats.typical_avg_seconds,
              undefined,
              undefined,
              '5k'
            )
          : null;

        // Build all results for frontend
        const allResults = storedResults.map(r => ({
          event: r.event,
          runDate: r.run_date,
          runNumber: r.run_number || '',
          position: r.position || '',
          time: r.time_display,
          time_seconds: r.time_seconds,
          ageGrade: r.age_grade,
          pb: r.pb,
        }));

        return NextResponse.json({
          ok: true,
          cached: true,
          needsRefresh,
          athlete: {
            name: cached.name,
            athleteId: id,
            totalRuns: storedResults.length,
            stats: stats ? {
              bestSeconds: stats.bestSeconds,
              bestTime: stats.bestTime,
              averageTime: stats.averageTime,
              typicalAvgTime: stats.typicalAvgTime,
              recentAvgTime: stats.recentAvgTime,
              pbEvent: stats.pb_event,
              pbDate: stats.pb_date,
              pbAge: stats.pb_age,
              trend: stats.trend,
              trendMessage: stats.trend_message,
              avgAgeGrade: stats.avg_age_grade,
              recentAvgAgeGrade: stats.recent_avg_age_grade,
              outlierCount: stats.outlier_count,
              normalRunCount: stats.normal_run_count,
            } : null,
            recentResults: allResults.slice(0, 10),
            allResults,
          },
          comparison,
        });
      }

      // Athlete exists but no results stored yet — fall through to scrape
    }

    // New athlete or no stored results: scrape full page
    const html = await fetchParkrunPage(id);
    const { name, results, error: parseError } = parseAthletePage(html);

    if (parseError) {
      if (cached) {
        return NextResponse.json({
          ok: true,
          cached: true,
          stale: true,
          needsRefresh: false,
          warning: parseError,
          athlete: {
            name: cached.name,
            athleteId: id,
            totalRuns: cached.total_runs,
          },
        });
      }
      return NextResponse.json({ ok: false, error: parseError }, { status: 500 });
    }

    if (!results.length) {
      return NextResponse.json({ ok: false, error: 'No results found for this athlete' }, { status: 404 });
    }

    // Store all results (passes name so athlete row can be created if needed)
    const newCount = await storeNewResults(id, results, name);
    console.log(`[Parkrun] Stored ${newCount} new results for athlete ${id}`);

    // Recalculate PBs
    await recalculatePBs(id);

    // Fetch back from DB with correct PB flags
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

    if (!stats) {
      return NextResponse.json({ ok: false, error: 'Could not calculate statistics' }, { status: 500 });
    }

    // Update summary
    await updateAthleteSummary(id, name, stats, results);

    // Log lookup
    await prisma.athlete_lookups.create({
      data: {
        source: 'parkrun',
        athlete_id: id,
        athlete_name: name,
      },
    });

    const comparison = getFullComparison(stats.typical_avg_seconds, undefined, undefined, '5k');

    const allResults = storedResults.map(r => ({
      event: r.event,
      runDate: r.run_date,
      runNumber: r.run_number || '',
      position: r.position || '',
      time: r.time_display,
      time_seconds: r.time_seconds,
      ageGrade: r.age_grade,
      pb: r.pb,
    }));

    return NextResponse.json({
      ok: true,
      cached: false,
      needsRefresh: false,
      athlete: {
        name,
        athleteId: id,
        totalRuns: storedResults.length,
        stats: {
          bestSeconds: stats.bestSeconds,
          bestTime: stats.bestTime,
          averageTime: stats.averageTime,
          typicalAvgTime: stats.typicalAvgTime,
          recentAvgTime: stats.recentAvgTime,
          pbEvent: stats.pb_event,
          pbDate: stats.pb_date,
          pbAge: stats.pb_age,
          trend: stats.trend,
          trendMessage: stats.trend_message,
          avgAgeGrade: stats.avg_age_grade,
          recentAvgAgeGrade: stats.recent_avg_age_grade,
          outlierCount: stats.outlier_count,
          normalRunCount: stats.normal_run_count,
        },
        recentResults: allResults.slice(0, 10),
        allResults,
      },
      comparison,
    });
  } catch (error) {
    console.error('Parkrun scraper error:', error);

    // Try to return stale cache if available
    const cached = await prisma.parkrun_athletes.findUnique({
      where: { athlete_id: id },
    }).catch(() => null);

    if (cached) {
      // Try to return stored results even on error
      const storedResults = await getStoredResults(id).catch(() => []);
      const allResults = storedResults.map(r => ({
        event: r.event,
        runDate: r.run_date,
        runNumber: r.run_number || '',
        position: r.position || '',
        time: r.time_display,
        time_seconds: r.time_seconds,
        ageGrade: r.age_grade,
        pb: r.pb,
      }));

      return NextResponse.json({
        ok: true,
        cached: true,
        stale: true,
        needsRefresh: false,
        warning: error instanceof Error ? error.message : 'Failed to fetch fresh data',
        athlete: {
          name: cached.name,
          athleteId: id,
          totalRuns: storedResults.length || cached.total_runs,
          stats: cached.typical_avg_seconds ? {
            bestSeconds: cached.best_time_seconds,
            bestTime: cached.best_time_seconds ? secondsToTimeStr(cached.best_time_seconds) : null,
            averageTime: cached.average_time_seconds ? secondsToTimeStr(cached.average_time_seconds) : null,
            typicalAvgTime: cached.typical_avg_seconds ? secondsToTimeStr(cached.typical_avg_seconds) : null,
            recentAvgTime: cached.recent_avg_seconds ? secondsToTimeStr(cached.recent_avg_seconds) : null,
            pbEvent: cached.pb_event,
            pbDate: cached.pb_date,
            pbAge: cached.pb_age,
            trend: cached.trend,
            trendMessage: cached.trend_message,
            avgAgeGrade: cached.avg_age_grade ? Number(cached.avg_age_grade) : null,
            recentAvgAgeGrade: cached.recent_avg_age_grade ? Number(cached.recent_avg_age_grade) : null,
            outlierCount: cached.outlier_count,
            normalRunCount: cached.normal_run_count,
          } : null,
          recentResults: allResults.length > 0 ? allResults.slice(0, 10) : cached.recent_results_json,
          allResults: allResults.length > 0 ? allResults : undefined,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch parkrun data' },
      { status: 500 }
    );
  }
}
