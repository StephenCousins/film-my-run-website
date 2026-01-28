import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/db';
import {
  parseTimeToSeconds,
  secondsToTimeStr,
  getFullComparison,
} from '@/lib/how-fast/comparisons';

export const dynamic = 'force-dynamic';

const PARKRUN_BASE_URL = 'https://www.parkrun.org.uk/parkrunner';
const CACHE_HOURS = 6; // How long before we refresh cached data
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

interface ParkrunResult {
  event: string;
  runDate: string;
  runNumber: string;
  position: string;
  time: string;
  time_seconds: number | null;
  ageGrade: string | null;
  pb: boolean;
}

interface AthleteStats {
  averageSeconds: number;
  averageTime: string;
  bestSeconds: number;
  bestTime: string;
  worstSeconds: number;
  worstTime: string;
  medianSeconds: number;
  medianTime: string;
  total_runs: number;
  pb_event: string;
  pb_date: string;
  pb_age: string;
  outlier_count: number;
  normal_run_count: number;
  typical_avg_seconds: number;
  typicalAvgTime: string;
  recent_avg_seconds: number | null;
  recentAvgTime: string | null;
  trend: string;
  trend_message: string;
  trendDiffSeconds: number;
  avg_age_grade: number | null;
  recent_avg_age_grade: number | null;
}

// Validate athlete ID
function validateAthleteId(id: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!id) {
    return { valid: false, error: 'Please enter a parkrun athlete ID' };
  }

  const sanitized = id.trim();

  if (!sanitized) {
    return { valid: false, error: 'Please enter a parkrun athlete ID' };
  }

  if (!/^\d+$/.test(sanitized)) {
    return { valid: false, error: 'Parkrun ID should contain only numbers (e.g., 123456)' };
  }

  if (sanitized.length > 10) {
    return { valid: false, error: 'Parkrun ID is too long' };
  }

  return { valid: true, sanitized };
}

// Fetch HTML from parkrun (with optional ScraperAPI proxy)
async function fetchParkrunPage(athlete_id: string): Promise<string> {
  const targetUrl = `${PARKRUN_BASE_URL}/${athlete_id}/all/`;

  let fetchUrl = targetUrl;

  if (SCRAPER_API_KEY) {
    // Use ScraperAPI to bypass IP blocks on cloud servers
    fetchUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&render=false`;
  }

  const response = await fetch(fetchUrl, {
    headers: HEADERS,
    signal: AbortSignal.timeout(SCRAPER_API_KEY ? 60000 : 15000),
  });

  if (response.status === 403) {
    throw new Error('Access denied by parkrun. Please try again later.');
  }

  if (response.status === 404) {
    throw new Error(`Athlete ID ${athlete_id} not found.`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }

  return response.text();
}

// Parse the athlete page HTML
function parseAthletePage(html: string, athlete_id: string): {
  name: string;
  results: ParkrunResult[];
  error?: string;
} {
  const $ = cheerio.load(html);

  // Get athlete name
  let name = 'Unknown';
  const h2 = $('h2').first();
  if (h2.length) {
    name = h2.text().trim().replace(/\s*-\s*All Results.*/, '');
  }

  // Find the results table
  let resultsTable: ReturnType<typeof $> | null = null;

  $('table#results').each((_, table) => {
    const firstRow = $(table).find('tr').first();
    const headers = firstRow.find('th, td').map((_, el) => $(el).text().trim()).get();

    if (headers.includes('Event') && headers.includes('Time')) {
      resultsTable = $(table);
      return false; // Break
    }
  });

  // Fallback to sortable table
  if (!resultsTable) {
    resultsTable = $('table.sortable').first();
  }

  if (!resultsTable || !resultsTable.length) {
    return {
      name,
      results: [],
      error: 'Could not find results table. The page structure may have changed.',
    };
  }

  // Parse rows
  const results: ParkrunResult[] = [];

  resultsTable.find('tr').slice(1).each((_, row) => {
    const cells = $(row).find('td');

    if (cells.length >= 5) {
      const time = $(cells[4]).text().trim();
      const time_seconds = parseTimeToSeconds(time);

      if (time_seconds) {
        results.push({
          event: $(cells[0]).text().trim(),
          runDate: $(cells[1]).text().trim(),
          runNumber: $(cells[2]).text().trim(),
          position: $(cells[3]).text().trim(),
          time,
          time_seconds,
          ageGrade: cells.length > 5 ? $(cells[5]).text().trim() : null,
          pb: $(row).text().includes('PB') || $(row).text().includes('New PB!'),
        });
      }
    }
  });

  return { name, results };
}

// Calculate statistics from results
function calculateStats(results: ParkrunResult[]): AthleteStats | null {
  if (!results.length) return null;

  const times = results.map(r => r.time_seconds).filter((t): t is number => t !== null);

  if (!times.length) return null;

  const sortedTimes = [...times].sort((a, b) => a - b);
  const avgSeconds = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const bestSeconds = Math.min(...times);
  const worstSeconds = Math.max(...times);

  // Median
  const mid = Math.floor(sortedTimes.length / 2);
  const medianSeconds = sortedTimes.length % 2 === 0
    ? Math.round((sortedTimes[mid - 1] + sortedTimes[mid]) / 2)
    : sortedTimes[mid];

  // Find PB and worst run
  const pbRun = results.reduce((best, r) =>
    (r.time_seconds && (!best.time_seconds || r.time_seconds < best.time_seconds)) ? r : best
  );
  const worstRun = results.reduce((worst, r) =>
    (r.time_seconds && (!worst.time_seconds || r.time_seconds > worst.time_seconds)) ? r : worst
  );

  // Outlier detection (times > 1.5x median)
  const outlierThreshold = medianSeconds * 1.5;
  const normalRuns = results.filter(r => r.time_seconds && r.time_seconds <= outlierThreshold);
  const outliers = results.filter(r => r.time_seconds && r.time_seconds > outlierThreshold);

  // Typical stats (excluding outliers)
  const normalTimes = normalRuns.map(r => r.time_seconds).filter((t): t is number => t !== null);
  const typical_avg_seconds = normalTimes.length > 0
    ? Math.round(normalTimes.reduce((a, b) => a + b, 0) / normalTimes.length)
    : avgSeconds;

  // Recent form (last 20 runs, excluding outliers)
  const recentRuns = results.slice(0, 20);
  const recentNormal = recentRuns.filter(r => r.time_seconds && r.time_seconds <= outlierThreshold);
  const recentTimes = recentNormal.map(r => r.time_seconds).filter((t): t is number => t !== null);
  const recent_avg_seconds = recentTimes.length > 0
    ? Math.round(recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length)
    : null;

  // Historical (runs older than last 20)
  const olderRuns = results.slice(20);
  const olderNormal = olderRuns.filter(r => r.time_seconds && r.time_seconds <= outlierThreshold);
  const olderTimes = olderNormal.map(r => r.time_seconds).filter((t): t is number => t !== null);
  const olderAvgSeconds = olderTimes.length > 0
    ? Math.round(olderTimes.reduce((a, b) => a + b, 0) / olderTimes.length)
    : null;

  // Trend analysis
  const trend = calculateTrend(recent_avg_seconds, olderAvgSeconds, medianSeconds);

  // Calculate PB age
  const pb_age = calculateTimeAgo(pbRun.runDate);

  // Age grades
  const ageGrades = results
    .map(r => r.ageGrade ? parseFloat(r.ageGrade.replace('%', '')) : null)
    .filter((ag): ag is number => ag !== null && !isNaN(ag));
  const avg_age_grade = ageGrades.length > 0
    ? Math.round((ageGrades.reduce((a, b) => a + b, 0) / ageGrades.length) * 10) / 10
    : null;

  // Recent age grade
  const recentAgeGrades = recentNormal.slice(0, 10)
    .map(r => r.ageGrade ? parseFloat(r.ageGrade.replace('%', '')) : null)
    .filter((ag): ag is number => ag !== null && !isNaN(ag));
  const recent_avg_age_grade = recentAgeGrades.length > 0
    ? Math.round((recentAgeGrades.reduce((a, b) => a + b, 0) / recentAgeGrades.length) * 10) / 10
    : null;

  return {
    averageSeconds: avgSeconds,
    averageTime: secondsToTimeStr(avgSeconds),
    bestSeconds,
    bestTime: secondsToTimeStr(bestSeconds),
    worstSeconds,
    worstTime: secondsToTimeStr(worstSeconds),
    medianSeconds,
    medianTime: secondsToTimeStr(medianSeconds),
    total_runs: results.length,
    pb_event: pbRun.event,
    pb_date: pbRun.runDate,
    pb_age,
    outlier_count: outliers.length,
    normal_run_count: normalRuns.length,
    typical_avg_seconds,
    typicalAvgTime: secondsToTimeStr(typical_avg_seconds),
    recent_avg_seconds,
    recentAvgTime: recent_avg_seconds ? secondsToTimeStr(recent_avg_seconds) : null,
    trend: trend.direction,
    trend_message: trend.message,
    trendDiffSeconds: trend.diffSeconds,
    avg_age_grade,
    recent_avg_age_grade,
  };
}

function calculateTrend(
  recentAvg: number | null,
  olderAvg: number | null,
  median: number
): { direction: string; message: string; diffSeconds: number } {
  if (!recentAvg || !olderAvg) {
    return {
      direction: 'unknown',
      message: 'Not enough data to determine trend',
      diffSeconds: 0,
    };
  }

  const diff = olderAvg - recentAvg; // Positive = getting faster
  const threshold = median * 0.02; // 2% of median

  if (diff > threshold) {
    return {
      direction: 'improving',
      message: `Getting faster! Recent runs are ${secondsToTimeStr(Math.abs(diff))} quicker than your historical average`,
      diffSeconds: diff,
    };
  } else if (diff < -threshold) {
    return {
      direction: 'declining',
      message: `Recent runs are ${secondsToTimeStr(Math.abs(diff))} slower than your historical average`,
      diffSeconds: diff,
    };
  }

  return {
    direction: 'stable',
    message: 'Your pace is consistent - maintaining steady performance',
    diffSeconds: diff,
  };
}

function calculateTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Unknown';

  try {
    // parkrun dates are typically in DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;

    const runDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const today = new Date();
    const diffMs = today.getTime() - runDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    if (years > 0) {
      return months > 0
        ? `${years} year${years > 1 ? 's' : ''}, ${months} month${months > 1 ? 's' : ''} ago`
        : `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    return 'Today';
  } catch {
    return dateStr;
  }
}

// Main handler
export async function GET(request: NextRequest) {
  const athlete_id = request.nextUrl.searchParams.get('id');

  // Validate
  const validation = validateAthleteId(athlete_id || '');
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const id = validation.sanitized!;

  try {
    // Check cache first
    const cached = await prisma.parkrun_athletes.findUnique({
      where: { athlete_id: id },
    });

    const cacheAge = cached
      ? (Date.now() - new Date(cached.updated_at).getTime()) / (1000 * 60 * 60)
      : Infinity;

    // Return cached if fresh enough
    if (cached && cacheAge < CACHE_HOURS) {
      // Update lookup count
      await prisma.parkrun_athletes.update({
        where: { athlete_id: id },
        data: {
          lookup_count: { increment: 1 },
          last_lookup_at: new Date(),
        },
      });

      // Log lookup
      await prisma.athlete_lookups.create({
        data: {
          source: 'parkrun',
          athlete_id: id,
          athlete_name: cached.name,
        },
      });

      const comparison = getFullComparison(
        cached.typical_avg_seconds || cached.average_time_seconds || 0,
        undefined,
        undefined,
        '5k'
      );

      return NextResponse.json({
        ok: true,
        cached: true,
        athlete: {
          name: cached.name,
          athlete_id: id,
          total_runs: cached.total_runs,
          stats: {
            bestSeconds: cached.best_time_seconds,
            bestTime: cached.best_time_seconds ? secondsToTimeStr(cached.best_time_seconds) : null,
            averageSeconds: cached.average_time_seconds,
            averageTime: cached.average_time_seconds ? secondsToTimeStr(cached.average_time_seconds) : null,
            typical_avg_seconds: cached.typical_avg_seconds,
            typicalAvgTime: cached.typical_avg_seconds ? secondsToTimeStr(cached.typical_avg_seconds) : null,
            recent_avg_seconds: cached.recent_avg_seconds,
            recentAvgTime: cached.recent_avg_seconds ? secondsToTimeStr(cached.recent_avg_seconds) : null,
            pb_event: cached.pb_event,
            pb_date: cached.pb_date,
            pb_age: cached.pb_age,
            trend: cached.trend,
            trend_message: cached.trend_message,
            avg_age_grade: cached.avg_age_grade ? Number(cached.avg_age_grade) : null,
            recent_avg_age_grade: cached.recent_avg_age_grade ? Number(cached.recent_avg_age_grade) : null,
            outlier_count: cached.outlier_count,
            normal_run_count: cached.normal_run_count,
          },
          recentResults: cached.recent_results_json,
        },
        comparison,
      });
    }

    // Scrape fresh data
    const html = await fetchParkrunPage(id);
    const { name, results, error: parseError } = parseAthletePage(html, id);

    if (parseError) {
      // If we have stale cache, return it with a warning
      if (cached) {
        return NextResponse.json({
          ok: true,
          cached: true,
          stale: true,
          warning: parseError,
          athlete: {
            name: cached.name,
            athlete_id: id,
            total_runs: cached.total_runs,
          },
        });
      }
      return NextResponse.json({ ok: false, error: parseError }, { status: 500 });
    }

    if (!results.length) {
      return NextResponse.json({ ok: false, error: 'No results found for this athlete' }, { status: 404 });
    }

    const stats = calculateStats(results);

    if (!stats) {
      return NextResponse.json({ ok: false, error: 'Could not calculate statistics' }, { status: 500 });
    }

    // Save to cache
    await prisma.parkrun_athletes.upsert({
      where: { athlete_id: id },
      create: {
        athlete_id: id,
        name,
        total_runs: results.length,
        best_time_seconds: stats.bestSeconds,
        average_time_seconds: stats.averageSeconds,
        typical_avg_seconds: stats.typical_avg_seconds,
        recent_avg_seconds: stats.recent_avg_seconds,
        avg_age_grade: stats.avg_age_grade,
        recent_avg_age_grade: stats.recent_avg_age_grade,
        pb_date: stats.pb_date,
        pb_event: stats.pb_event,
        pb_age: stats.pb_age,
        trend: stats.trend,
        trend_message: stats.trend_message,
        outlier_count: stats.outlier_count,
        normal_run_count: stats.normal_run_count,
        recent_results_json: JSON.parse(JSON.stringify(results.slice(0, 10))),
        updated_at: new Date(),
      },
      update: {
        name,
        total_runs: results.length,
        best_time_seconds: stats.bestSeconds,
        average_time_seconds: stats.averageSeconds,
        typical_avg_seconds: stats.typical_avg_seconds,
        recent_avg_seconds: stats.recent_avg_seconds,
        avg_age_grade: stats.avg_age_grade,
        recent_avg_age_grade: stats.recent_avg_age_grade,
        pb_date: stats.pb_date,
        pb_event: stats.pb_event,
        pb_age: stats.pb_age,
        trend: stats.trend,
        trend_message: stats.trend_message,
        outlier_count: stats.outlier_count,
        normal_run_count: stats.normal_run_count,
        recent_results_json: JSON.parse(JSON.stringify(results.slice(0, 10))),
        lookup_count: { increment: 1 },
        last_lookup_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Log lookup
    await prisma.athlete_lookups.create({
      data: {
        source: 'parkrun',
        athlete_id: id,
        athlete_name: name,
      },
    });

    const comparison = getFullComparison(stats.typical_avg_seconds, undefined, undefined, '5k');

    return NextResponse.json({
      ok: true,
      cached: false,
      athlete: {
        name,
        athlete_id: id,
        total_runs: results.length,
        stats,
        recentResults: results.slice(0, 10),
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
      return NextResponse.json({
        ok: true,
        cached: true,
        stale: true,
        warning: error instanceof Error ? error.message : 'Failed to fetch fresh data',
        athlete: {
          name: cached.name,
          athlete_id: id,
          total_runs: cached.total_runs,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch parkrun data' },
      { status: 500 }
    );
  }
}
