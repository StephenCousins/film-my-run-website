import { Pool } from 'pg';
import {
  formatTime,
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
// This connects to the existing Railway PostgreSQL database
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

// Query functions
export async function getAllParkruns(): Promise<ParkrunResult[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        id,
        date,
        event,
        run_number,
        position,
        time_seconds,
        age_grade,
        age_category_position,
        pb
      FROM parkrun_results
      ORDER BY date DESC
    `);

    return result.rows.map(row => ({
      ...row,
      date: row.date.toISOString().split('T')[0],
      time_formatted: formatTime(row.time_seconds),
    }));
  } finally {
    client.release();
  }
}

export async function getYearlyStats(): Promise<YearlyStats[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        EXTRACT(YEAR FROM date) as year,
        COUNT(*) as runs,
        MIN(time_seconds) as best_time_seconds,
        MIN(position) as best_position,
        AVG(time_seconds)::INTEGER as average_time_seconds,
        COUNT(*) FILTER (WHERE pb = true) as pb_count
      FROM parkrun_results
      GROUP BY EXTRACT(YEAR FROM date)
      ORDER BY year DESC
    `);

    return result.rows.map(row => ({
      year: parseInt(row.year),
      runs: parseInt(row.runs),
      best_time_seconds: row.best_time_seconds,
      best_time_formatted: formatTime(row.best_time_seconds),
      best_position: row.best_position,
      average_time_seconds: row.average_time_seconds,
      pb_count: parseInt(row.pb_count),
    }));
  } finally {
    client.release();
  }
}

export async function getVenueStats(): Promise<VenueStats[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        event,
        COUNT(*) as visit_count,
        MIN(time_seconds) as best_time_seconds,
        MIN(date) as first_visit,
        MAX(date) as last_visit,
        AVG(time_seconds)::INTEGER as average_time_seconds
      FROM parkrun_results
      GROUP BY event
      ORDER BY visit_count DESC, best_time_seconds ASC
    `);

    return result.rows.map(row => ({
      event: row.event,
      visit_count: parseInt(row.visit_count),
      best_time_seconds: row.best_time_seconds,
      best_time_formatted: formatTime(row.best_time_seconds),
      first_visit: row.first_visit.toISOString().split('T')[0],
      last_visit: row.last_visit.toISOString().split('T')[0],
      average_time_seconds: row.average_time_seconds,
    }));
  } finally {
    client.release();
  }
}

export async function getAgeCategoryStats(): Promise<AgeCategoryStats[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        age_category_position as position,
        COUNT(*) as count
      FROM parkrun_results
      WHERE age_category_position IS NOT NULL
      GROUP BY age_category_position
      ORDER BY age_category_position
    `);

    return result.rows.map(row => ({
      position: row.position,
      count: parseInt(row.count),
    }));
  } finally {
    client.release();
  }
}

export async function getVenueCoordinates(): Promise<VenueCoordinate[]> {
  const client = await getPool().connect();
  try {
    // First get venues with visit counts
    const visitResult = await client.query(`
      SELECT
        event,
        COUNT(*) as visit_count
      FROM parkrun_results
      GROUP BY event
    `);

    // Then get coordinates from venue table
    const coordResult = await client.query(`
      SELECT
        name,
        latitude,
        longitude
      FROM parkrun_venues
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    const visitCounts = new Map(
      visitResult.rows.map(r => [r.event.toLowerCase(), parseInt(r.visit_count)])
    );

    return coordResult.rows
      .filter(row => visitCounts.has(row.name.toLowerCase()))
      .map(row => ({
        event: row.name,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        visit_count: visitCounts.get(row.name.toLowerCase()) || 0,
      }));
  } finally {
    client.release();
  }
}

export async function getMetadata(): Promise<ParkrunMetadata> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        COUNT(*) as total,
        MIN(time_seconds) as pb,
        MIN(position) as best_position,
        COUNT(DISTINCT event) as unique_venues,
        MIN(date) as first_date,
        MAX(date) as last_date
      FROM parkrun_results
    `);

    const pbResult = await client.query(`
      SELECT event, date
      FROM parkrun_results
      WHERE time_seconds = (SELECT MIN(time_seconds) FROM parkrun_results)
      LIMIT 1
    `);

    const row = result.rows[0];
    const pbRow = pbResult.rows[0];

    return {
      totalParkruns: parseInt(row.total),
      personalBest: row.pb,
      personalBestFormatted: formatTime(row.pb),
      personalBestVenue: pbRow?.event || '',
      personalBestDate: pbRow?.date?.toISOString().split('T')[0] || '',
      bestPosition: row.best_position,
      uniqueVenues: parseInt(row.unique_venues),
      firstParkrunDate: row.first_date.toISOString().split('T')[0],
      lastParkrunDate: row.last_date.toISOString().split('T')[0],
      totalDistanceKm: parseInt(row.total) * 5,
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
    // Get all UK parkrun venues with rankings
    let query = `
      SELECT
        v.name as venue,
        v.difficulty_rank as rank,
        v.difficulty_rating,
        v.total_finishers,
        v.average_time_seconds
      FROM parkrun_venues v
      WHERE v.country = 'UK' OR v.country IS NULL
    `;

    if (search) {
      query += ` AND LOWER(v.name) LIKE LOWER($1)`;
    }

    query += ` ORDER BY v.difficulty_rank ASC NULLS LAST`;

    const params = search ? [`%${search}%`] : [];
    const venueResult = await client.query(query, params);

    // Get user's visited venues
    const userResult = await client.query(`
      SELECT
        event,
        MIN(time_seconds) as best_time,
        COUNT(*) as visits
      FROM parkrun_results
      GROUP BY event
    `);

    const userVisits = new Map(
      userResult.rows.map(r => [
        r.event.toLowerCase(),
        { best_time: r.best_time, visits: parseInt(r.visits) }
      ])
    );

    const rankings = venueResult.rows.map(row => {
      const userData = userVisits.get(row.venue.toLowerCase());
      return {
        rank: row.rank || 999,
        venue: row.venue,
        difficulty_rating: row.difficulty_rating || 0,
        total_finishers: row.total_finishers || 0,
        average_time_seconds: row.average_time_seconds || 0,
        user_visited: !!userData,
        user_best_time: userData?.best_time || null,
        user_visits: userData?.visits || 0,
      };
    });

    const totalVenues = venueResult.rows.length;
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
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT date, time_seconds, event
      FROM parkrun_results
      WHERE pb = true
      ORDER BY date ASC
    `);

    return result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      time_seconds: row.time_seconds,
      venue: row.event,
    }));
  } finally {
    client.release();
  }
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
      SELECT date FROM parkrun_results ORDER BY date ASC
    `);

    const dates = result.rows.map(r => new Date(r.date));

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
        // Consecutive week
        tempStreak++;
      } else {
        // Streak broken
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
          longestStart = tempStart;
          longestEnd = dates[i-1];
        }
        tempStreak = 1;
        tempStart = dates[i];
      }
    }

    // Check final streak
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

    if (daysSinceLast <= 7) {
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
        TO_CHAR(date, 'YYYY-MM') as month,
        COUNT(*) as runs,
        AVG(time_seconds)::INTEGER as average_time
      FROM parkrun_results
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `);

    return result.rows.map(row => ({
      month: row.month,
      runs: parseInt(row.runs),
      average_time: row.average_time,
    }));
  } finally {
    client.release();
  }
}
