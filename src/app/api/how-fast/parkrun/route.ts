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
  timeSeconds: number | null;
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
  totalRuns: number;
  pbEvent: string;
  pbDate: string;
  pbAge: string;
  outlierCount: number;
  normalRunCount: number;
  typicalAvgSeconds: number;
  typicalAvgTime: string;
  recentAvgSeconds: number | null;
  recentAvgTime: string | null;
  trend: string;
  trendMessage: string;
  trendDiffSeconds: number;
  avgAgeGrade: number | null;
  recentAvgAgeGrade: number | null;
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
async function fetchParkrunPage(athleteId: string): Promise<string> {
  const targetUrl = `${PARKRUN_BASE_URL}/${athleteId}/all/`;

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
    throw new Error(`Athlete ID ${athleteId} not found.`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }

  return response.text();
}

// Parse the athlete page HTML
function parseAthletePage(html: string, athleteId: string): {
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
      const timeSeconds = parseTimeToSeconds(time);

      if (timeSeconds) {
        results.push({
          event: $(cells[0]).text().trim(),
          runDate: $(cells[1]).text().trim(),
          runNumber: $(cells[2]).text().trim(),
          position: $(cells[3]).text().trim(),
          time,
          timeSeconds,
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

  const times = results.map(r => r.timeSeconds).filter((t): t is number => t !== null);

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
    (r.timeSeconds && (!best.timeSeconds || r.timeSeconds < best.timeSeconds)) ? r : best
  );
  const worstRun = results.reduce((worst, r) =>
    (r.timeSeconds && (!worst.timeSeconds || r.timeSeconds > worst.timeSeconds)) ? r : worst
  );

  // Outlier detection (times > 1.5x median)
  const outlierThreshold = medianSeconds * 1.5;
  const normalRuns = results.filter(r => r.timeSeconds && r.timeSeconds <= outlierThreshold);
  const outliers = results.filter(r => r.timeSeconds && r.timeSeconds > outlierThreshold);

  // Typical stats (excluding outliers)
  const normalTimes = normalRuns.map(r => r.timeSeconds).filter((t): t is number => t !== null);
  const typicalAvgSeconds = normalTimes.length > 0
    ? Math.round(normalTimes.reduce((a, b) => a + b, 0) / normalTimes.length)
    : avgSeconds;

  // Recent form (last 20 runs, excluding outliers)
  const recentRuns = results.slice(0, 20);
  const recentNormal = recentRuns.filter(r => r.timeSeconds && r.timeSeconds <= outlierThreshold);
  const recentTimes = recentNormal.map(r => r.timeSeconds).filter((t): t is number => t !== null);
  const recentAvgSeconds = recentTimes.length > 0
    ? Math.round(recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length)
    : null;

  // Historical (runs older than last 20)
  const olderRuns = results.slice(20);
  const olderNormal = olderRuns.filter(r => r.timeSeconds && r.timeSeconds <= outlierThreshold);
  const olderTimes = olderNormal.map(r => r.timeSeconds).filter((t): t is number => t !== null);
  const olderAvgSeconds = olderTimes.length > 0
    ? Math.round(olderTimes.reduce((a, b) => a + b, 0) / olderTimes.length)
    : null;

  // Trend analysis
  const trend = calculateTrend(recentAvgSeconds, olderAvgSeconds, medianSeconds);

  // Calculate PB age
  const pbAge = calculateTimeAgo(pbRun.runDate);

  // Age grades
  const ageGrades = results
    .map(r => r.ageGrade ? parseFloat(r.ageGrade.replace('%', '')) : null)
    .filter((ag): ag is number => ag !== null && !isNaN(ag));
  const avgAgeGrade = ageGrades.length > 0
    ? Math.round((ageGrades.reduce((a, b) => a + b, 0) / ageGrades.length) * 10) / 10
    : null;

  // Recent age grade
  const recentAgeGrades = recentNormal.slice(0, 10)
    .map(r => r.ageGrade ? parseFloat(r.ageGrade.replace('%', '')) : null)
    .filter((ag): ag is number => ag !== null && !isNaN(ag));
  const recentAvgAgeGrade = recentAgeGrades.length > 0
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
    totalRuns: results.length,
    pbEvent: pbRun.event,
    pbDate: pbRun.runDate,
    pbAge,
    outlierCount: outliers.length,
    normalRunCount: normalRuns.length,
    typicalAvgSeconds,
    typicalAvgTime: secondsToTimeStr(typicalAvgSeconds),
    recentAvgSeconds,
    recentAvgTime: recentAvgSeconds ? secondsToTimeStr(recentAvgSeconds) : null,
    trend: trend.direction,
    trendMessage: trend.message,
    trendDiffSeconds: trend.diffSeconds,
    avgAgeGrade,
    recentAvgAgeGrade,
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
  const athleteId = request.nextUrl.searchParams.get('id');

  // Validate
  const validation = validateAthleteId(athleteId || '');
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const id = validation.sanitized!;

  try {
    // Check cache first
    const cached = await prisma.parkrunAthlete.findUnique({
      where: { athleteId: id },
    });

    const cacheAge = cached
      ? (Date.now() - new Date(cached.updatedAt).getTime()) / (1000 * 60 * 60)
      : Infinity;

    // Return cached if fresh enough
    if (cached && cacheAge < CACHE_HOURS) {
      // Update lookup count
      await prisma.parkrunAthlete.update({
        where: { athleteId: id },
        data: {
          lookupCount: { increment: 1 },
          lastLookupAt: new Date(),
        },
      });

      // Log lookup
      await prisma.athleteLookup.create({
        data: {
          source: 'parkrun',
          athleteId: id,
          athleteName: cached.name,
        },
      });

      const comparison = getFullComparison(
        cached.typicalAvgSeconds || cached.averageTimeSeconds || 0,
        undefined,
        undefined,
        '5k'
      );

      return NextResponse.json({
        ok: true,
        cached: true,
        athlete: {
          name: cached.name,
          athleteId: id,
          totalRuns: cached.totalRuns,
          stats: {
            bestSeconds: cached.bestTimeSeconds,
            bestTime: cached.bestTimeSeconds ? secondsToTimeStr(cached.bestTimeSeconds) : null,
            averageSeconds: cached.averageTimeSeconds,
            averageTime: cached.averageTimeSeconds ? secondsToTimeStr(cached.averageTimeSeconds) : null,
            typicalAvgSeconds: cached.typicalAvgSeconds,
            typicalAvgTime: cached.typicalAvgSeconds ? secondsToTimeStr(cached.typicalAvgSeconds) : null,
            recentAvgSeconds: cached.recentAvgSeconds,
            recentAvgTime: cached.recentAvgSeconds ? secondsToTimeStr(cached.recentAvgSeconds) : null,
            pbEvent: cached.pbEvent,
            pbDate: cached.pbDate,
            pbAge: cached.pbAge,
            trend: cached.trend,
            trendMessage: cached.trendMessage,
            avgAgeGrade: cached.avgAgeGrade ? Number(cached.avgAgeGrade) : null,
            recentAvgAgeGrade: cached.recentAvgAgeGrade ? Number(cached.recentAvgAgeGrade) : null,
            outlierCount: cached.outlierCount,
            normalRunCount: cached.normalRunCount,
          },
          recentResults: cached.recentResultsJson,
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
            athleteId: id,
            totalRuns: cached.totalRuns,
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
    await prisma.parkrunAthlete.upsert({
      where: { athleteId: id },
      create: {
        athleteId: id,
        name,
        totalRuns: results.length,
        bestTimeSeconds: stats.bestSeconds,
        averageTimeSeconds: stats.averageSeconds,
        typicalAvgSeconds: stats.typicalAvgSeconds,
        recentAvgSeconds: stats.recentAvgSeconds,
        avgAgeGrade: stats.avgAgeGrade,
        recentAvgAgeGrade: stats.recentAvgAgeGrade,
        pbDate: stats.pbDate,
        pbEvent: stats.pbEvent,
        pbAge: stats.pbAge,
        trend: stats.trend,
        trendMessage: stats.trendMessage,
        outlierCount: stats.outlierCount,
        normalRunCount: stats.normalRunCount,
        recentResultsJson: JSON.parse(JSON.stringify(results.slice(0, 10))),
      },
      update: {
        name,
        totalRuns: results.length,
        bestTimeSeconds: stats.bestSeconds,
        averageTimeSeconds: stats.averageSeconds,
        typicalAvgSeconds: stats.typicalAvgSeconds,
        recentAvgSeconds: stats.recentAvgSeconds,
        avgAgeGrade: stats.avgAgeGrade,
        recentAvgAgeGrade: stats.recentAvgAgeGrade,
        pbDate: stats.pbDate,
        pbEvent: stats.pbEvent,
        pbAge: stats.pbAge,
        trend: stats.trend,
        trendMessage: stats.trendMessage,
        outlierCount: stats.outlierCount,
        normalRunCount: stats.normalRunCount,
        recentResultsJson: JSON.parse(JSON.stringify(results.slice(0, 10))),
        lookupCount: { increment: 1 },
        lastLookupAt: new Date(),
      },
    });

    // Log lookup
    await prisma.athleteLookup.create({
      data: {
        source: 'parkrun',
        athleteId: id,
        athleteName: name,
      },
    });

    const comparison = getFullComparison(stats.typicalAvgSeconds, undefined, undefined, '5k');

    return NextResponse.json({
      ok: true,
      cached: false,
      athlete: {
        name,
        athleteId: id,
        totalRuns: results.length,
        stats,
        recentResults: results.slice(0, 10),
      },
      comparison,
    });
  } catch (error) {
    console.error('Parkrun scraper error:', error);

    // Try to return stale cache if available
    const cached = await prisma.parkrunAthlete.findUnique({
      where: { athleteId: id },
    }).catch(() => null);

    if (cached) {
      return NextResponse.json({
        ok: true,
        cached: true,
        stale: true,
        warning: error instanceof Error ? error.message : 'Failed to fetch fresh data',
        athlete: {
          name: cached.name,
          athleteId: id,
          totalRuns: cached.totalRuns,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch parkrun data' },
      { status: 500 }
    );
  }
}
