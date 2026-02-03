import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/db';
import {
  parseTimeToSeconds,
  secondsToTimeStr,
  getPercentile,
  getAbilityLevel,
  getRatingMessage,
} from '@/lib/how-fast/comparisons';

export const dynamic = 'force-dynamic';

const PO10_BASE_URL = 'https://earlyaccess.myathletics.uk/Home/Athlete';
const CACHE_HOURS = 6;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

// Distance mappings — maps new PO10 event names to our internal keys
const DISTANCE_MAP: Record<string, string> = {
  '5K': '5k',
  '5000': '5k',
  '10K': '10k',
  '10000': '10k',
  '10 Miles': '10m',
  '10M': '10m',
  'Half Marathon': 'half',
  'HM': 'half',
  'Marathon': 'marathon',
  'Mar': 'marathon',
  '20 Miles': '20m',
  '20M': '20m',
};

const DISTANCE_NAMES: Record<string, string> = {
  '5k': '5K',
  '10k': '10K',
  '10m': '10 Miles',
  'half': 'Half Marathon',
  'marathon': 'Marathon',
  '20m': '20 Miles',
};

interface PB {
  time: string;
  seconds: number;
  timeFormatted: string;
}

interface Po10Data {
  name: string;
  athlete_id: string;
  club: string | null;
  age_group: string | null;
  gender: 'male' | 'female' | null;
  pbs: Record<string, PB>;
  error?: string;
}

// UUID regex for new PO10 athlete IDs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validate athlete ID (accepts new UUID format)
function validateAthleteId(id: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!id) {
    return { valid: false, error: 'Please enter a Power of 10 athlete ID' };
  }

  const sanitized = id.trim().toLowerCase();

  if (!sanitized) {
    return { valid: false, error: 'Please enter a Power of 10 athlete ID' };
  }

  if (!UUID_REGEX.test(sanitized)) {
    return { valid: false, error: 'Power of 10 ID should be a UUID (e.g. c24cb315-536c-458c-af1f-4b45d89e919e)' };
  }

  return { valid: true, sanitized };
}

// Events we care about for ranking/comparisons
const TARGET_EVENTS = new Set(Object.keys(DISTANCE_MAP));

/**
 * Convert a raw PO10 performance value to seconds.
 * Short events (5K, 10K, etc.) are stored in centiseconds.
 * Long events (half marathon, marathon, etc.) are stored in seconds.
 * Heuristic: values > 36000 are centiseconds, otherwise seconds.
 */
function po10ValueToSeconds(raw: number): number {
  return raw > 36000 ? raw / 100 : raw;
}

// Fetch and parse athlete page
async function fetchPo10Page(athlete_id: string): Promise<Po10Data> {
  const url = `${PO10_BASE_URL}/${athlete_id}`;

  const response = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }

  const html = await response.text();
  return parsePo10Page(html, athlete_id);
}

function parsePo10Page(html: string, athlete_id: string): Po10Data {
  const $ = cheerio.load(html);
  const pageText = $.text();

  // Name: <div class="name">First</div> <div class="surname">Last</div>
  let name = 'Unknown';
  const firstName = $('div.name').first().text().trim();
  const surname = $('div.surname').first().text().trim();
  if (firstName && surname) {
    name = `${firstName} ${surname}`;
  } else if (firstName) {
    name = firstName;
  }

  // Club: <a> tag linking to /Home/Club/
  let club: string | null = null;
  const clubLink = $('a[href*="/Home/Club/"]').first();
  if (clubLink.length) {
    club = clubLink.text().trim();
  }

  // Gender and age group from page text
  let gender: 'male' | 'female' | null = null;
  const genderMatch = pageText.match(/Sex\s*[:\s]*(Men|Women|Male|Female)/i);
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    gender = (g === 'men' || g === 'male') ? 'male' : 'female';
  }

  let age_group: string | null = null;
  const ageMatch = pageText.match(/Age Group\s*[:\s]*(V?\d+|SEN|U\d+)/i);
  if (ageMatch) {
    age_group = ageMatch[1];
  }

  // Extract PBs from JavaScript variables embedded in the page.
  // The new PO10 site stores per-event performance arrays:
  //   var dataEventName{N} = 'Marathon';
  //   var dataValues{N} = [13405,12499,...,10737,...];
  // The true all-time PB is the minimum of dataValues{N}.
  // Multiple indices can share the same event name (different categories).
  // We take the best (lowest) across all indices per event.

  const pbs: Record<string, PB> = {};

  // Extract event names
  const eventNameRegex = /var\s+dataEventName(\d+)\s*=\s*'([^']+)'/g;
  const eventNames: Record<string, string> = {};
  let match;
  while ((match = eventNameRegex.exec(html)) !== null) {
    eventNames[match[1]] = match[2];
  }

  // Extract performance arrays and find minimum per index
  const dataValuesRegex = /var\s+dataValues(\d+)\s*=\s*\[([^\]]+)\]/g;
  const minValues: Record<string, number> = {};
  while ((match = dataValuesRegex.exec(html)) !== null) {
    const idx = match[1];
    const values = match[2].split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v) && v > 0);
    if (values.length > 0) {
      minValues[idx] = Math.min(...values);
    }
  }

  // Process each event index
  for (const idx of Object.keys(eventNames)) {
    const eventName = eventNames[idx];
    const rawValue = minValues[idx];
    if (rawValue === undefined) continue;

    // Only process events we can rank
    if (!TARGET_EVENTS.has(eventName)) continue;

    const normalizedEvent = DISTANCE_MAP[eventName];
    if (!normalizedEvent) continue;

    const seconds = po10ValueToSeconds(rawValue);

    // Only keep the best PB per distance
    if (!pbs[normalizedEvent] || seconds < pbs[normalizedEvent].seconds) {
      pbs[normalizedEvent] = {
        time: secondsToTimeStr(seconds),
        seconds,
        timeFormatted: secondsToTimeStr(seconds),
      };
    }
  }

  return {
    name,
    athlete_id,
    club,
    age_group,
    gender,
    pbs,
  };
}

// Calculate overall stats from PBs
function calculateOverallStats(
  pbs: Record<string, PB>,
  gender: 'male' | 'female' | null,
  age_group: string | null
) {
  const results: {
    distance: string;
    distanceName: string;
    time: string;
    seconds: number;
    percentile: number;
    abilityLevel: string;
  }[] = [];

  // Estimate age from age group
  let estimatedAge = 35;
  if (age_group) {
    const match = age_group.match(/V?(\d+)/);
    if (match) {
      estimatedAge = parseInt(match[1]);
      if (age_group.startsWith('V')) {
        // Vet categories - V40, V50, etc.
        estimatedAge = parseInt(match[1]);
      }
    } else if (age_group === 'SEN') {
      estimatedAge = 30;
    }
  }

  const effectiveGender = gender || 'male';

  for (const [distance, pb] of Object.entries(pbs)) {
    const percentile = getPercentile(pb.seconds, distance);
    const abilityLevel = getAbilityLevel(pb.seconds, estimatedAge, effectiveGender);

    results.push({
      distance,
      distanceName: DISTANCE_NAMES[distance] || distance.toUpperCase(),
      time: pb.timeFormatted,
      seconds: pb.seconds,
      percentile,
      abilityLevel,
    });
  }

  // Calculate overall percentile (average of all distances)
  const percentiles = results.map(r => r.percentile);
  const overall_percentile = percentiles.length > 0
    ? Math.round((percentiles.reduce((a, b) => a + b, 0) / percentiles.length) * 10) / 10
    : 0;

  // Determine overall ability level
  const abilityOrder = ['elite', 'advanced', 'intermediate', 'novice', 'beginner'];
  const abilities = results.map(r => r.abilityLevel);
  const overallAbility = abilities.length > 0
    ? abilityOrder.find(level => abilities.includes(level)) || 'beginner'
    : 'beginner';

  return {
    distances: results,
    overallPercentile: overall_percentile,
    overallAbilityLevel: overallAbility,
    ratingMessage: getRatingMessage(overall_percentile),
  };
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
    const cached = await prisma.po10_athletes.findUnique({
      where: { athlete_id: id },
    });

    const cacheAge = cached
      ? (Date.now() - new Date(cached.updated_at).getTime()) / (1000 * 60 * 60)
      : Infinity;

    // Return cached if fresh enough
    if (cached && cacheAge < CACHE_HOURS) {
      // Update lookup count
      await prisma.po10_athletes.update({
        where: { athlete_id: id },
        data: {
          lookup_count: { increment: 1 },
          last_lookup_at: new Date(),
        },
      });

      // Log lookup
      await prisma.athlete_lookups.create({
        data: {
          source: 'po10',
          athlete_id: id,
          athlete_name: cached.name,
        },
      });

      const pbs = (cached.pbs_json as unknown as Record<string, PB>) || {};
      const stats = calculateOverallStats(
        pbs,
        cached.gender as 'male' | 'female' | null,
        cached.age_group
      );

      return NextResponse.json({
        ok: true,
        cached: true,
        athlete: {
          name: cached.name,
          athleteId: id,
          club: cached.club,
          ageGroup: cached.age_group,
          gender: cached.gender,
          pbs,
        },
        stats,
      });
    }

    // Scrape fresh data
    const data = await fetchPo10Page(id);

    if (data.error) {
      if (cached) {
        return NextResponse.json({
          ok: true,
          cached: true,
          stale: true,
          warning: data.error,
          athlete: {
            name: cached.name,
            athleteId: id,
            club: cached.club,
          },
        });
      }
      return NextResponse.json({ ok: false, error: data.error }, { status: 500 });
    }

    if (Object.keys(data.pbs).length === 0) {
      return NextResponse.json({ ok: false, error: 'No personal bests found for this athlete' }, { status: 404 });
    }

    const stats = calculateOverallStats(data.pbs, data.gender, data.age_group);

    // Save to cache
    const pbs_jsonValue = JSON.parse(JSON.stringify(data.pbs));
    await prisma.po10_athletes.upsert({
      where: { athlete_id: id },
      create: {
        athlete_id: id,
        name: data.name,
        club: data.club,
        gender: data.gender,
        age_group: data.age_group,
        pbs_json: pbs_jsonValue,
        overall_percentile: stats.overallPercentile,
        overall_ability_level: stats.overallAbilityLevel,
        updated_at: new Date(),
      },
      update: {
        name: data.name,
        club: data.club,
        gender: data.gender,
        age_group: data.age_group,
        pbs_json: pbs_jsonValue,
        overall_percentile: stats.overallPercentile,
        overall_ability_level: stats.overallAbilityLevel,
        lookup_count: { increment: 1 },
        last_lookup_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Log lookup
    await prisma.athlete_lookups.create({
      data: {
        source: 'po10',
        athlete_id: id,
        athlete_name: data.name,
      },
    });

    return NextResponse.json({
      ok: true,
      cached: false,
      athlete: {
        name: data.name,
        athleteId: data.athlete_id,
        club: data.club,
        ageGroup: data.age_group,
        gender: data.gender,
        pbs: data.pbs,
      },
      stats,
    });
  } catch (error) {
    console.error('Power of 10 scraper error:', error);

    // Try to return stale cache
    const cached = await prisma.po10_athletes.findUnique({
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
          athleteId: id,
          club: cached.club,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch Power of 10 data' },
      { status: 500 }
    );
  }
}
