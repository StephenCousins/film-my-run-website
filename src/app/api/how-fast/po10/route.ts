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

const PO10_BASE_URL = 'https://www.thepowerof10.info/athletes/profile.aspx';
const CACHE_HOURS = 6;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

// Distance mappings
const DISTANCE_MAP: Record<string, string> = {
  '5K': '5k',
  '5000': '5k',
  '10K': '10k',
  '10000': '10k',
  '10M': '10m',
  'HM': 'half',
  'Mar': 'marathon',
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
  athleteId: string;
  club: string | null;
  ageGroup: string | null;
  gender: 'male' | 'female' | null;
  pbs: Record<string, PB>;
  error?: string;
}

// Validate athlete ID
function validateAthleteId(id: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!id) {
    return { valid: false, error: 'Please enter a Power of 10 athlete ID' };
  }

  const sanitized = id.trim();

  if (!sanitized) {
    return { valid: false, error: 'Please enter a Power of 10 athlete ID' };
  }

  if (!/^\d+$/.test(sanitized)) {
    return { valid: false, error: 'Power of 10 ID should contain only numbers' };
  }

  if (sanitized.length > 10) {
    return { valid: false, error: 'Power of 10 ID is too long' };
  }

  return { valid: true, sanitized };
}

// Fetch and parse athlete page
async function fetchPo10Page(athleteId: string): Promise<Po10Data> {
  const url = `${PO10_BASE_URL}?athleteid=${athleteId}`;

  const response = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }

  const html = await response.text();
  return parsePo10Page(html, athleteId);
}

function parsePo10Page(html: string, athleteId: string): Po10Data {
  const $ = cheerio.load(html);

  // Get athlete name
  let name = 'Unknown';
  const h2 = $('h2').first();
  if (h2.length) {
    name = h2.text().trim();
  }

  // Get club, gender, age group from page text
  const pageText = $.text();

  let club: string | null = null;
  const clubMatch = pageText.match(/Club:([A-Za-z0-9 ]+?)(?:Gender:|County:|$)/);
  if (clubMatch) {
    club = clubMatch[1].trim();
  }

  let gender: 'male' | 'female' | null = null;
  const genderMatch = pageText.match(/Gender:(Male|Female)/);
  if (genderMatch) {
    gender = genderMatch[1].toLowerCase() as 'male' | 'female';
  }

  let ageGroup: string | null = null;
  const ageGroupMatch = pageText.match(/Age Group:(V?\d+|SEN|U\d+)/);
  if (ageGroupMatch) {
    ageGroup = ageGroupMatch[1];
  }

  // Extract PBs
  const pbs: Record<string, PB> = {};
  const targetEvents = ['5K', '10K', '10M', 'HM', 'Mar', '5000', '10000', '20M'];

  $('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 2) {
      const event = $(cells[0]).text().trim();

      if (targetEvents.includes(event)) {
        const pbText = $(cells[1]).text().trim();
        const pbSeconds = parseTimeToSeconds(pbText);

        if (pbSeconds) {
          const normalizedEvent = DISTANCE_MAP[event] || event.toLowerCase();

          // Only keep if better than existing
          if (!pbs[normalizedEvent] || pbSeconds < pbs[normalizedEvent].seconds) {
            pbs[normalizedEvent] = {
              time: pbText,
              seconds: pbSeconds,
              timeFormatted: secondsToTimeStr(pbSeconds),
            };
          }
        }
      }
    }
  });

  return {
    name,
    athleteId,
    club,
    ageGroup,
    gender,
    pbs,
  };
}

// Calculate overall stats from PBs
function calculateOverallStats(
  pbs: Record<string, PB>,
  gender: 'male' | 'female' | null,
  ageGroup: string | null
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
  if (ageGroup) {
    const match = ageGroup.match(/V?(\d+)/);
    if (match) {
      estimatedAge = parseInt(match[1]);
      if (ageGroup.startsWith('V')) {
        // Vet categories - V40, V50, etc.
        estimatedAge = parseInt(match[1]);
      }
    } else if (ageGroup === 'SEN') {
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
  const overallPercentile = percentiles.length > 0
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
    overallPercentile,
    overallAbilityLevel: overallAbility,
    ratingMessage: getRatingMessage(overallPercentile),
  };
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
    const cached = await prisma.po10Athlete.findUnique({
      where: { athleteId: id },
    });

    const cacheAge = cached
      ? (Date.now() - new Date(cached.updatedAt).getTime()) / (1000 * 60 * 60)
      : Infinity;

    // Return cached if fresh enough
    if (cached && cacheAge < CACHE_HOURS) {
      // Update lookup count
      await prisma.po10Athlete.update({
        where: { athleteId: id },
        data: {
          lookupCount: { increment: 1 },
          lastLookupAt: new Date(),
        },
      });

      // Log lookup
      await prisma.athleteLookup.create({
        data: {
          source: 'po10',
          athleteId: id,
          athleteName: cached.name,
        },
      });

      const pbs = (cached.pbsJson as unknown as Record<string, PB>) || {};
      const stats = calculateOverallStats(
        pbs,
        cached.gender as 'male' | 'female' | null,
        cached.ageGroup
      );

      return NextResponse.json({
        ok: true,
        cached: true,
        athlete: {
          name: cached.name,
          athleteId: id,
          club: cached.club,
          ageGroup: cached.ageGroup,
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

    const stats = calculateOverallStats(data.pbs, data.gender, data.ageGroup);

    // Save to cache
    const pbsJsonValue = JSON.parse(JSON.stringify(data.pbs));
    await prisma.po10Athlete.upsert({
      where: { athleteId: id },
      create: {
        athleteId: id,
        name: data.name,
        club: data.club,
        gender: data.gender,
        ageGroup: data.ageGroup,
        pbsJson: pbsJsonValue,
        overallPercentile: stats.overallPercentile,
        overallAbilityLevel: stats.overallAbilityLevel,
      },
      update: {
        name: data.name,
        club: data.club,
        gender: data.gender,
        ageGroup: data.ageGroup,
        pbsJson: pbsJsonValue,
        overallPercentile: stats.overallPercentile,
        overallAbilityLevel: stats.overallAbilityLevel,
        lookupCount: { increment: 1 },
        lastLookupAt: new Date(),
      },
    });

    // Log lookup
    await prisma.athleteLookup.create({
      data: {
        source: 'po10',
        athleteId: id,
        athleteName: data.name,
      },
    });

    return NextResponse.json({
      ok: true,
      cached: false,
      athlete: data,
      stats,
    });
  } catch (error) {
    console.error('Power of 10 scraper error:', error);

    // Try to return stale cache
    const cached = await prisma.po10Athlete.findUnique({
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
