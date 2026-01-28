import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Verify API key
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const expectedKey = process.env.SYNC_API_KEY;

  if (!expectedKey) {
    console.error('SYNC_API_KEY not configured');
    return false;
  }

  return apiKey === expectedKey;
}

// Parse date string to Date object
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  // Try DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  }

  // Try DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return new Date(`${year}-${month}-${day}`);
  }

  return null;
}

// Parse time string to seconds
function parseTimeToSeconds(timeStr: string | null): number | null {
  if (!timeStr) return null;

  // HH:MM:SS format
  if (/^\d+:\d{2}:\d{2}$/.test(timeStr)) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }

  // Xh Ym Zs format
  const match = timeStr.match(/(\d+)h\s*(\d+)m\s*(\d+)s/i);
  if (match) {
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
  }

  return null;
}

// Extract URL from "text||url" format
function extractUrl(value: string | null): string | null {
  if (!value) return null;
  if (value.includes('||')) {
    return value.split('||')[1]?.trim() || null;
  }
  return value;
}

interface RaceInput {
  date?: string;
  event: string;
  type?: string;
  distance_km?: number;
  time_hms?: string;
  time_seconds?: number;
  elevation?: number;
  position?: string;
  terrain?: string;
  video_url?: string;
  strava_url?: string;
  results_url?: string;
}

// POST /api/races/sync - Bulk import races
export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { races, mode = 'append' } = body as { races: RaceInput[]; mode?: 'append' | 'replace' };

    if (!Array.isArray(races)) {
      return NextResponse.json({ error: 'races must be an array' }, { status: 400 });
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // If replace mode, clear existing data
      if (mode === 'replace') {
        await tx.races.deleteMany({});
      }

      // Insert new races
      const created = await tx.races.createMany({
        data: races
          .filter((race) => race.event) // Ensure event is present
          .map((race) => {
            const date = parseDate(race.date || null);
            return {
              date: date || new Date(), // Default to now if no date
              event: race.event,
              type: race.type || null,
              distance_km: race.distance_km || null,
              time_hms: race.time_hms || null,
              time_seconds: race.time_seconds || parseTimeToSeconds(race.time_hms || null),
              elevation: race.elevation || null,
              position: race.position || null,
              terrain: race.terrain || null,
              video_url: extractUrl(race.video_url || null),
              strava_url: extractUrl(race.strava_url || null),
              results_url: extractUrl(race.results_url || null),
              updated_at: new Date(),
            };
          }),
      });

      return created;
    });

    return NextResponse.json({
      ok: true,
      message: `Successfully imported ${result.count} races`,
      count: result.count,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to sync races' },
      { status: 500 }
    );
  }
}

// DELETE /api/races/sync - Clear all races
export async function DELETE(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prisma.races.deleteMany({});

    return NextResponse.json({
      ok: true,
      message: `Deleted ${result.count} races`,
      count: result.count,
    });
  } catch (error) {
    console.error('Clear error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to clear races' },
      { status: 500 }
    );
  }
}
