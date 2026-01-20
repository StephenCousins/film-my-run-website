import { NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.RACE_SPREADSHEET_ID || '1WVpQhFTZxoxGptF8mn16eRPOm6OUsm8di5bQ96_90uk';

interface RaceRow {
  number: string;
  date: string;
  name: string;
  distance: string;
  time: string;
  position: string;
  elevation: string;
  video: string;
  report: string;
  strava: string;
  officialResults: string;
  type: string;
  terrain: string;
  marathonCount: string;
  ultraCount: string;
  roadCount: string;
  trailCount: string;
  hundredMilers: string;
  raceCount: string;
}

interface RouteCoordinate {
  lat: number;
  lng: number;
}

interface RoutesData {
  [activityId: string]: RouteCoordinate[];
}

/**
 * Safely parse Google Sheets JSONP response
 */
function parseGoogleSheetsResponse(responseData: string): { table: { rows: { c: ({ v?: string | number; f?: string } | null)[] }[] } } {
  if (!responseData || typeof responseData !== 'string') {
    throw new Error('Invalid response from Google Sheets');
  }

  const startMarker = 'google.visualization.Query.setResponse(';
  const startIndex = responseData.indexOf(startMarker);

  if (startIndex === -1) {
    throw new Error('Unexpected Google Sheets response format');
  }

  const jsonStart = startIndex + startMarker.length;
  const jsonEnd = responseData.lastIndexOf(');');

  if (jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('Could not find JSON boundaries in response');
  }

  const jsonString = responseData.substring(jsonStart, jsonEnd);

  try {
    return JSON.parse(jsonString);
  } catch (parseError) {
    throw new Error(`Failed to parse Google Sheets JSON: ${parseError}`);
  }
}

export async function GET() {
  try {
    // Try to fetch races from cached JSON first (from public folder)
    let races: RaceRow[] = [];
    let routes: RoutesData = {};

    // Fetch races from Google Sheets
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

    if (!response.ok) {
      throw new Error('Failed to fetch spreadsheet data');
    }

    const responseText = await response.text();
    const data = parseGoogleSheetsResponse(responseText);

    if (!data.table || !Array.isArray(data.table.rows)) {
      throw new Error('Invalid data structure from Google Sheets');
    }

    // Parse the data into race objects
    data.table.rows.forEach((row) => {
      if (!row.c || !row.c[0]) return;

      const race: RaceRow = {
        number: String(row.c[0]?.v || ''),
        date: String(row.c[1]?.f || row.c[1]?.v || ''),
        name: String(row.c[2]?.v || ''),
        distance: String(row.c[3]?.v || ''),
        time: String(row.c[4]?.v || ''),
        position: String(row.c[5]?.v || ''),
        elevation: String(row.c[6]?.v || ''),
        video: String(row.c[7]?.v || ''),
        report: String(row.c[8]?.v || ''),
        strava: String(row.c[9]?.v || ''),
        officialResults: String(row.c[10]?.v || ''),
        type: String(row.c[11]?.v || ''),
        terrain: String(row.c[12]?.v || ''),
        marathonCount: String(row.c[13]?.v || ''),
        ultraCount: String(row.c[14]?.v || ''),
        roadCount: String(row.c[15]?.v || ''),
        trailCount: String(row.c[16]?.v || ''),
        hundredMilers: String(row.c[17]?.v || ''),
        raceCount: String(row.c[18]?.v || ''),
      };

      // Only include races with Strava links
      if (race.strava) {
        races.push(race);
      }
    });

    // Try to load pre-cached routes
    try {
      const routesUrl = process.env.ROUTES_DATA_URL || '/routes-data.json';
      if (routesUrl.startsWith('http')) {
        const routesResponse = await fetch(routesUrl, { next: { revalidate: 86400 } });
        if (routesResponse.ok) {
          const routesData = await routesResponse.json();
          routes = routesData.routes || {};
        }
      }
    } catch {
      // Routes cache not available, will need client-side fetching
    }

    return NextResponse.json({
      ok: true,
      races,
      routes,
    });
  } catch (error) {
    console.error('Error fetching race map data:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        races: [],
        routes: {},
      },
      { status: 500 }
    );
  }
}
