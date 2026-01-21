import { Pool } from 'pg';
import {
  formatTime,
  parseTimeToSeconds,
  type ParkrunResult,
  type YearlyStats,
  type VenueStats,
  type AgeCategoryStats,
  type VenueCoordinate,
  type ParkrunMetadata,
  type UKRanking,
} from './parkrun-types';

// Re-export types and utilities for server-side code
export {
  formatTime,
  type ParkrunResult,
  type YearlyStats,
  type VenueStats,
  type AgeCategoryStats,
  type VenueCoordinate,
  type ParkrunMetadata,
  type UKRanking,
};

// Create a connection pool for the parkrun database
const globalForPool = globalThis as unknown as {
  parkrunPool: Pool | undefined;
};

function getPool(): Pool {
  if (globalForPool.parkrunPool) {
    return globalForPool.parkrunPool;
  }

  const connectionString = process.env.PARKRUN_DATABASE_URL;

  if (!connectionString) {
    throw new Error('PARKRUN_DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPool.parkrunPool = pool;
  }

  return pool;
}

// Helper to parse date_display in various formats to a sortable date
function parseDateDisplay(dateDisplay: string | null): Date | null {
  if (!dateDisplay) return null;

  // Try DD/MM/YYYY format (e.g., "30/04/2011")
  if (dateDisplay.includes('/')) {
    const parts = dateDisplay.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }

  // Try DD-MM-YY format (e.g., "12-10-24" for 12 Oct 2024)
  if (dateDisplay.includes('-') && dateDisplay.split('-').length === 3) {
    const parts = dateDisplay.split('-');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    // Convert 2-digit year to 4-digit (assume 20xx for now)
    if (year < 100) {
      year = year + 2000;
    }
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  // Try "DD MMM YYYY" format (e.g., "10 Jul 2023")
  const monthNames: { [key: string]: number } = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };
  const match = dateDisplay.match(/^(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toLowerCase();
    const year = parseInt(match[3], 10);
    const month = monthNames[monthStr];
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  return null;
}

// Query functions - adapted to actual database schema
export async function getAllParkruns(): Promise<ParkrunResult[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        id,
        parkrun_date,
        date_display,
        venue as event,
        event_number as run_number,
        overall_pos as position,
        finish_time,
        age_cat_pos as age_category_position
      FROM parkruns
      ORDER BY id DESC
    `);

    // Sort by date using date_display (DD/MM/YYYY format) which is the reliable field
    const sortedRows = [...result.rows].sort((a, b) => {
      const dateA = parseDateDisplay(a.date_display);
      const dateB = parseDateDisplay(b.date_display);
      const timeA = dateA?.getTime() || 0;
      const timeB = dateB?.getTime() || 0;
      return timeB - timeA; // DESC order (most recent first)
    });

    // Find PBs - track best time seen so far going chronologically (oldest first)
    const chronological = [...sortedRows].reverse();

    let bestTime = Infinity;
    const pbSet = new Set<number>();

    for (const row of chronological) {
      const timeSeconds = parseTimeToSeconds(row.finish_time);
      if (timeSeconds < bestTime) {
        bestTime = timeSeconds;
        pbSet.add(row.id);
      }
    }

    return sortedRows.map(row => {
      const timeSeconds = parseTimeToSeconds(row.finish_time);
      // Normalize all dates to DD/MM/YYYY format
      let dateStr = '';
      const parsedDate = parseDateDisplay(row.date_display);
      if (parsedDate) {
        dateStr = `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
      } else {
        dateStr = row.date_display || '';
      }
      return {
        id: row.id,
        date: dateStr,
        event: row.event,
        run_number: row.run_number || 0,
        position: row.position || 0,
        time_seconds: timeSeconds,
        time_formatted: row.finish_time,
        age_grade: null,
        age_category_position: row.age_category_position,
        pb: pbSet.has(row.id),
      };
    });
  } finally {
    client.release();
  }
}

export async function getYearlyStats(): Promise<YearlyStats[]> {
  const client = await getPool().connect();
  try {
    // Use pre-calculated yearly_stats table
    const result = await client.query(`
      SELECT
        year,
        runs,
        fastest_time,
        best_position,
        cumulative
      FROM yearly_stats
      ORDER BY year DESC
    `);

    // Also get average times from parkruns table
    const avgResult = await client.query(`
      SELECT
        year,
        AVG(
          CAST(SPLIT_PART(finish_time, ':', 1) AS INTEGER) * 60 +
          CAST(SPLIT_PART(finish_time, ':', 2) AS INTEGER)
        )::INTEGER as average_time_seconds
      FROM parkruns
      WHERE finish_time IS NOT NULL
      GROUP BY year
    `);

    const avgMap = new Map(avgResult.rows.map(r => [r.year, r.average_time_seconds]));

    // Count PBs per year
    const allRuns = await getAllParkruns();
    const pbCountByYear = new Map<number, number>();
    for (const run of allRuns) {
      if (run.pb) {
        const year = new Date(run.date).getFullYear();
        pbCountByYear.set(year, (pbCountByYear.get(year) || 0) + 1);
      }
    }

    return result.rows.map(row => ({
      year: row.year,
      runs: row.runs || 0,
      best_time_seconds: row.fastest_time ? parseTimeToSeconds(row.fastest_time) : 0,
      best_time_formatted: row.fastest_time || '',
      best_position: row.best_position || 0,
      average_time_seconds: avgMap.get(row.year) || 0,
      pb_count: pbCountByYear.get(row.year) || 0,
    }));
  } finally {
    client.release();
  }
}

export async function getVenueStats(): Promise<VenueStats[]> {
  const client = await getPool().connect();
  try {
    // Use pre-calculated venues table
    const result = await client.query(`
      SELECT
        name as event,
        visit_count,
        best_time,
        first_visit,
        last_visit
      FROM venues
      WHERE visit_count > 0
      ORDER BY visit_count DESC, best_time ASC
    `);

    // Get average times per venue
    const avgResult = await client.query(`
      SELECT
        venue,
        AVG(
          CAST(SPLIT_PART(finish_time, ':', 1) AS INTEGER) * 60 +
          CAST(SPLIT_PART(finish_time, ':', 2) AS INTEGER)
        )::INTEGER as average_time_seconds
      FROM parkruns
      WHERE finish_time IS NOT NULL
      GROUP BY venue
    `);

    const avgMap = new Map(avgResult.rows.map(r => [r.venue, r.average_time_seconds]));

    return result.rows.map(row => ({
      event: row.event,
      visit_count: row.visit_count || 0,
      best_time_seconds: row.best_time ? parseTimeToSeconds(row.best_time) : 0,
      best_time_formatted: row.best_time || '',
      first_visit: row.first_visit?.toISOString?.().split('T')[0] || '',
      last_visit: row.last_visit?.toISOString?.().split('T')[0] || '',
      average_time_seconds: avgMap.get(row.event) || 0,
    }));
  } finally {
    client.release();
  }
}

export async function getAgeCategoryStats(): Promise<AgeCategoryStats[]> {
  const client = await getPool().connect();
  try {
    // Use pre-calculated age_category_stats table
    const result = await client.query(`
      SELECT position, count
      FROM age_category_stats
      WHERE count > 0
      ORDER BY position
    `);

    return result.rows.map(row => ({
      position: row.position,
      count: row.count || 0,
    }));
  } finally {
    client.release();
  }
}

export async function getVenueCoordinates(): Promise<VenueCoordinate[]> {
  const client = await getPool().connect();
  try {
    // Join venue_coordinates with venues to get visit counts
    const result = await client.query(`
      SELECT
        vc.name as event,
        vc.lat as latitude,
        vc.lng as longitude,
        COALESCE(v.visit_count, 0) as visit_count
      FROM venue_coordinates vc
      LEFT JOIN venues v ON LOWER(v.name) = LOWER(vc.name)
      WHERE v.visit_count > 0
    `);

    return result.rows.map(row => ({
      event: row.event,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      visit_count: row.visit_count || 0,
    }));
  } finally {
    client.release();
  }
}

// Helper to format date as DD/MM/YYYY
function formatDateDMY(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function getMetadata(): Promise<ParkrunMetadata> {
  const client = await getPool().connect();
  try {
    // Get totals from parkruns table (exclude null dates for min/max)
    const result = await client.query(`
      SELECT
        COUNT(*) as total,
        MIN(age_cat_pos) as best_position,
        COUNT(DISTINCT venue) as unique_venues,
        MIN(parkrun_date) as first_date,
        MAX(parkrun_date) as last_date
      FROM parkruns
      WHERE parkrun_date IS NOT NULL
    `);

    // Get total count including those without dates
    const totalResult = await client.query(`SELECT COUNT(*) as total FROM parkruns`);

    // Get PB info
    const pbResult = await client.query(`
      SELECT venue, parkrun_date, date_display, finish_time
      FROM parkruns
      WHERE finish_time = (
        SELECT MIN(finish_time) FROM parkruns WHERE finish_time IS NOT NULL
      )
      LIMIT 1
    `);

    const row = result.rows[0];
    const totalRow = totalResult.rows[0];
    const pbRow = pbResult.rows[0];
    const pbTimeSeconds = pbRow?.finish_time ? parseTimeToSeconds(pbRow.finish_time) : 0;

    return {
      totalParkruns: parseInt(totalRow.total) || 0,
      personalBest: pbTimeSeconds,
      personalBestFormatted: pbRow?.finish_time || '',
      personalBestVenue: pbRow?.venue || '',
      personalBestDate: formatDateDMY(pbRow?.parkrun_date) || pbRow?.date_display || '',
      bestPosition: row.best_position || 0,
      uniqueVenues: parseInt(row.unique_venues) || 0,
      firstParkrunDate: formatDateDMY(row.first_date),
      lastParkrunDate: formatDateDMY(row.last_date),
      totalDistanceKm: (parseInt(totalRow.total) || 0) * 5,
    };
  } finally {
    client.release();
  }
}

export async function getUKRankings(search?: string): Promise<{
  rankings: UKRanking[];
  userCompletion: { completed: number; total: number; percentage: number };
}> {
  const client = await getPool().connect();
  try {
    // Get rankings from parkrun_rankings table
    let query = `
      SELECT rank, name as venue, rating as difficulty_rating
      FROM parkrun_rankings
    `;

    if (search) {
      query += ` WHERE LOWER(name) LIKE LOWER($1)`;
    }

    query += ` ORDER BY rank ASC`;

    const params = search ? [`%${search}%`] : [];
    const rankingResult = await client.query(query, params);

    // Get user's visited venues from venues table
    const userResult = await client.query(`
      SELECT name, visit_count, best_time
      FROM venues
      WHERE visit_count > 0
    `);

    const userVisits = new Map(
      userResult.rows.map(r => [
        r.name.toLowerCase(),
        {
          best_time: r.best_time ? parseTimeToSeconds(r.best_time) : null,
          visits: r.visit_count
        }
      ])
    );

    const rankings = rankingResult.rows.map(row => {
      const userData = userVisits.get(row.venue.toLowerCase());
      return {
        rank: row.rank || 999,
        venue: row.venue,
        difficulty_rating: parseFloat(row.difficulty_rating) || 0,
        total_finishers: 0,
        average_time_seconds: 0,
        user_visited: !!userData,
        user_best_time: userData?.best_time || null,
        user_visits: userData?.visits || 0,
      };
    });

    const totalVenues = rankingResult.rows.length;
    const completed = rankings.filter(r => r.user_visited).length;

    return {
      rankings,
      userCompletion: {
        completed,
        total: totalVenues,
        percentage: totalVenues > 0 ? Math.round((completed / totalVenues) * 100) : 0,
      },
    };
  } finally {
    client.release();
  }
}

// Get PB progression over time
export async function getPBProgression(): Promise<{ date: string; time_seconds: number; venue: string }[]> {
  const allRuns = await getAllParkruns();

  // Sort chronologically
  const sorted = [...allRuns].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });

  // Find PBs
  const pbs: { date: string; time_seconds: number; venue: string }[] = [];
  let bestTime = Infinity;

  for (const run of sorted) {
    if (run.time_seconds < bestTime) {
      bestTime = run.time_seconds;
      pbs.push({
        date: run.date,
        time_seconds: run.time_seconds,
        venue: run.event,
      });
    }
  }

  return pbs;
}

// Get streak information
export async function getStreakInfo(): Promise<{
  currentStreak: number;
  longestStreak: number;
  longestStreakStart: string;
  longestStreakEnd: string;
}> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT DISTINCT parkrun_date
      FROM parkruns
      WHERE parkrun_date IS NOT NULL
      ORDER BY parkrun_date ASC
    `);

    const dates = result.rows.map(r => new Date(r.parkrun_date));

    if (dates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        longestStreakStart: '',
        longestStreakEnd: '',
      };
    }

    // Calculate streaks (consecutive weeks)
    let longestStreak = 1;
    let tempStreak = 1;
    let longestStart = dates[0];
    let longestEnd = dates[0];
    let tempStart = dates[0];

    for (let i = 1; i < dates.length; i++) {
      const daysDiff = Math.round((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 6 && daysDiff <= 8) {
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
          longestStart = tempStart;
          longestEnd = dates[i-1];
        }
        tempStreak = 1;
        tempStart = dates[i];
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
      longestStart = tempStart;
      longestEnd = dates[dates.length - 1];
    }

    // Calculate current streak from most recent run
    let currentStreak = 0;
    const now = new Date();
    const lastRun = dates[dates.length - 1];
    const daysSinceLast = Math.round((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLast <= 14) {
      currentStreak = 1;
      for (let i = dates.length - 2; i >= 0; i--) {
        const daysDiff = Math.round((dates[i+1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 6 && daysDiff <= 8) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return {
      currentStreak,
      longestStreak,
      longestStreakStart: longestStart.toISOString().split('T')[0],
      longestStreakEnd: longestEnd.toISOString().split('T')[0],
    };
  } finally {
    client.release();
  }
}

// Get monthly stats for insights
export async function getMonthlyStats(): Promise<{
  month: string;
  runs: number;
  average_time: number;
}[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        TO_CHAR(parkrun_date, 'YYYY-MM') as month,
        COUNT(*) as runs,
        AVG(
          CAST(SPLIT_PART(finish_time, ':', 1) AS INTEGER) * 60 +
          CAST(SPLIT_PART(finish_time, ':', 2) AS INTEGER)
        )::INTEGER as average_time
      FROM parkruns
      WHERE parkrun_date IS NOT NULL AND finish_time IS NOT NULL
      GROUP BY TO_CHAR(parkrun_date, 'YYYY-MM')
      ORDER BY month ASC
    `);

    return result.rows.map(row => ({
      month: row.month,
      runs: parseInt(row.runs),
      average_time: row.average_time || 0,
    }));
  } finally {
    client.release();
  }
}
