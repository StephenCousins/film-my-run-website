// File parsing utilities for GPX and FIT files

import {
  Coordinate,
  haversineDistance,
  validateCoordinate,
  validateElevation,
  validateTimestamp,
  GPS_VALIDATION,
} from './gps';
import { calculateElevationStats, cleanGPSData, rollingMedian } from './stats';
import { RouteData, ParsedRawData, ValidatedData, RouteStats } from './types';

/**
 * Generate a unique ID for a route
 */
function generateRouteId(): string {
  return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate parsed data, returning cleaned arrays
 */
export function validateParsedData(rawData: ParsedRawData): ValidatedData {
  const validated: ValidatedData = {
    coordinates: [],
    elevations: [],
    timestamps: [],
    heartRates: [],
    cadences: [],
    powers: [],
    skipped: 0,
    warnings: [],
  };

  let lastValidTimestamp: Date | null = null;

  for (let i = 0; i < rawData.coordinates.length; i++) {
    const coord = rawData.coordinates[i];
    const coordResult = validateCoordinate(coord.lat, coord.lng);

    if (!coordResult.valid) {
      validated.skipped++;
      validated.warnings.push(`Point ${i}: Invalid coordinate (${coordResult.reason})`);
      continue;
    }

    const elevResult = validateElevation(rawData.elevations[i]);
    if (!elevResult.valid) {
      validated.warnings.push(
        `Point ${i}: Invalid elevation (${elevResult.reason}), using null`
      );
    }

    const tsResult = validateTimestamp(rawData.timestamps[i], lastValidTimestamp);
    if (!tsResult.valid) {
      validated.warnings.push(
        `Point ${i}: Invalid timestamp (${tsResult.reason}), using null`
      );
    } else if (tsResult.value) {
      lastValidTimestamp = tsResult.value;
    }

    validated.coordinates.push(coord);
    validated.elevations.push(elevResult.valid ? elevResult.value : null);
    validated.timestamps.push(tsResult.valid ? tsResult.value : null);
    validated.heartRates.push(rawData.heartRates[i] ?? null);
    validated.cadences.push(rawData.cadences[i] ?? null);
    validated.powers.push(rawData.powers[i] ?? null);
  }

  return validated;
}

/**
 * Extract extension value from GPX extensions
 */
function extractExtensionValue(
  extensions: Element | null,
  tagNames: string[]
): number | null {
  if (!extensions) return null;
  for (const tagName of tagNames) {
    const node = extensions.getElementsByTagName(tagName)[0];
    if (node?.textContent) {
      const value = parseFloat(node.textContent);
      if (!isNaN(value)) return value;
    }
  }
  return null;
}

/**
 * Calculate speeds and paces from coordinates and timestamps
 */
function calculateSpeedsAndPaces(
  coordinates: Coordinate[],
  timestamps: (Date | null)[]
): { speeds: (number | null)[]; paces: (number | null)[] } {
  const speeds: (number | null)[] = [];
  const paces: (number | null)[] = [];

  for (let i = 0; i < coordinates.length; i++) {
    if (i === 0 || !timestamps[i] || !timestamps[i - 1]) {
      speeds.push(null);
      paces.push(null);
    } else {
      const dist = haversineDistance(coordinates[i - 1], coordinates[i]);
      const timeDiff =
        (timestamps[i]!.getTime() - timestamps[i - 1]!.getTime()) / 1000 / 3600;
      if (timeDiff > 0 && dist > 0) {
        const speed = dist / timeDiff;
        speeds.push(speed);
        paces.push(60 / speed);
      } else {
        speeds.push(null);
        paces.push(null);
      }
    }
  }

  return { speeds, paces };
}

/**
 * Create RouteData from parsed components
 */
function createRouteData(
  filename: string,
  color: string,
  coordinates: Coordinate[],
  elevations: (number | null)[],
  timestamps: (Date | null)[],
  heartRates: (number | null)[],
  cadences: (number | null)[],
  powers: (number | null)[],
  speeds: (number | null)[],
  paces: (number | null)[]
): RouteData {
  let distance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    distance += haversineDistance(coordinates[i - 1], coordinates[i]);
  }

  const elevStats = calculateElevationStats(elevations);

  let duration: number | null = null;
  const validTimestamps = timestamps.filter((t): t is Date => t !== null);
  if (validTimestamps.length >= 2) {
    duration =
      (validTimestamps[validTimestamps.length - 1].getTime() -
        validTimestamps[0].getTime()) /
      1000;
  }

  const stats: RouteStats = {
    distance,
    elevationGain: elevStats.gain,
    elevationLoss: elevStats.loss,
    minElevation: elevStats.min,
    maxElevation: elevStats.max,
    duration,
  };

  // Create display name from filename
  const displayName = filename
    .replace(/\.(gpx|fit)$/i, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');

  return {
    id: generateRouteId(),
    filename,
    displayName,
    color,
    coordinates,
    elevations,
    timestamps,
    heartRates,
    cadences,
    powers,
    speeds,
    paces,
    stats,
  };
}

/**
 * Parse GPX file content
 */
export function parseGPX(xmlString: string, color: string, filename: string): RouteData {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'text/xml');

  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid XML');
  }

  const rawData: ParsedRawData = {
    coordinates: [],
    elevations: [],
    timestamps: [],
    heartRates: [],
    cadences: [],
    powers: [],
  };

  const trkpts = xml.getElementsByTagName('trkpt');
  const points = trkpts.length > 0 ? trkpts : xml.getElementsByTagName('rtept');

  for (let i = 0; i < points.length; i++) {
    const lat = parseFloat(points[i].getAttribute('lat') || '');
    const lon = parseFloat(points[i].getAttribute('lon') || '');
    rawData.coordinates.push({ lat, lng: lon });

    const eleNode = points[i].getElementsByTagName('ele')[0];
    rawData.elevations.push(eleNode ? parseFloat(eleNode.textContent || '') : null);

    const timeNode = points[i].getElementsByTagName('time')[0];
    rawData.timestamps.push(
      timeNode ? new Date(timeNode.textContent || '') : null
    );

    const extensions = points[i].getElementsByTagName('extensions')[0] || null;
    rawData.heartRates.push(
      extractExtensionValue(extensions, [
        'tpx1:hr',
        'gpxtpx:hr',
        'ns3:hr',
        'hr',
        'heartrate',
        'HeartRate',
      ])
    );

    const cadenceValue = extractExtensionValue(extensions, [
      'tpx1:cad',
      'gpxtpx:cad',
      'ns3:cad',
      'cad',
      'cadence',
      'Cadence',
      'RunCadence',
    ]);
    rawData.cadences.push(
      cadenceValue !== null ? cadenceValue * 2 : null
    );

    rawData.powers.push(
      extractExtensionValue(extensions, [
        'tpx1:power',
        'power',
        'Power',
        'gpxtpx:power',
        'ns3:power',
        'pwr',
      ])
    );
  }

  if (rawData.coordinates.length === 0) {
    throw new Error('No track points found');
  }

  const validated = validateParsedData(rawData);

  if (validated.warnings.length > 0) {
    console.warn(
      `GPX ${filename}: ${validated.skipped} points skipped during validation`
    );
    if (validated.warnings.length <= 10) {
      validated.warnings.forEach((w) => console.warn(w));
    } else {
      console.warn(`First 10 of ${validated.warnings.length} warnings:`);
      validated.warnings.slice(0, 10).forEach((w) => console.warn(w));
    }
  }

  if (validated.coordinates.length === 0) {
    throw new Error('No valid track points after validation');
  }

  const { coordinates, elevations, timestamps, heartRates, cadences, powers } =
    validated;

  const { speeds, paces } = calculateSpeedsAndPaces(coordinates, timestamps);

  const cleanedData = cleanGPSData(
    speeds,
    paces,
    coordinates,
    timestamps,
    GPS_VALIDATION.MAX_SPEED_KMH
  );
  const smoothedSpeeds = rollingMedian(cleanedData.speeds, 5);
  const smoothedPaces = rollingMedian(cleanedData.paces, 5);

  return createRouteData(
    filename,
    color,
    coordinates,
    elevations,
    timestamps,
    heartRates,
    cadences,
    powers,
    smoothedSpeeds,
    smoothedPaces
  );
}

/**
 * Parse FIT file content using fit-file-parser
 */
export async function parseFIT(
  arrayBuffer: ArrayBuffer,
  color: string,
  filename: string
): Promise<RouteData> {
  // Dynamically import fit-file-parser
  const FitParser = (await import('fit-file-parser')).default;

  return new Promise((resolve, reject) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'list',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fitParser.parse(arrayBuffer, (error: string | undefined, data: any) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      if (!data) {
        reject(new Error('No data returned from FIT parser'));
        return;
      }

      const records = data.records || [];
      if (records.length === 0) {
        reject(new Error('No data points found'));
        return;
      }

      const coordinates: Coordinate[] = [];
      const elevations: (number | null)[] = [];
      const timestamps: (Date | null)[] = [];
      const heartRates: (number | null)[] = [];
      const cadences: (number | null)[] = [];
      const powers: (number | null)[] = [];
      const speeds: (number | null)[] = [];
      const paces: (number | null)[] = [];

      records.forEach((record: Record<string, unknown>) => {
        const lat = record.position_lat as number | undefined;
        const lng = record.position_long as number | undefined;

        if (lat !== undefined && lng !== undefined) {
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            coordinates.push({ lat, lng });
            elevations.push(
              (record.enhanced_altitude as number) ??
                (record.altitude as number) ??
                null
            );
            timestamps.push(
              record.timestamp ? new Date(record.timestamp as string | number) : null
            );
            heartRates.push((record.heart_rate as number) ?? null);
            const cadence = record.cadence as number | undefined;
            cadences.push(
              cadence !== null && cadence !== undefined ? cadence * 2 : null
            );
            powers.push((record.power as number) ?? null);

            let speedKmh: number | null = null;
            const enhancedSpeed = record.enhanced_speed as number | undefined;
            const speed = record.speed as number | undefined;
            if (enhancedSpeed !== undefined && enhancedSpeed !== null) {
              speedKmh = enhancedSpeed;
            } else if (speed !== undefined && speed !== null) {
              speedKmh = speed;
            }
            speeds.push(speedKmh);
            paces.push(speedKmh && speedKmh > 0 ? 60 / speedKmh : null);
          }
        }
      });

      if (coordinates.length === 0) {
        reject(new Error('No valid GPS data found'));
        return;
      }

      const cleanedData = cleanGPSData(
        speeds,
        paces,
        coordinates,
        timestamps,
        GPS_VALIDATION.MAX_SPEED_KMH
      );
      const smoothedSpeeds = rollingMedian(cleanedData.speeds, 5);
      const smoothedPaces = rollingMedian(cleanedData.paces, 5);

      resolve(
        createRouteData(
          filename,
          color,
          coordinates,
          elevations,
          timestamps,
          heartRates,
          cadences,
          powers,
          smoothedSpeeds,
          smoothedPaces
        )
      );
    });
  });
}

/**
 * Parse a file based on its extension
 */
export async function parseFile(
  file: File,
  color: string
): Promise<RouteData> {
  const filename = file.name;
  const extension = filename.split('.').pop()?.toLowerCase();

  if (extension === 'gpx') {
    const text = await file.text();
    return parseGPX(text, color, filename);
  } else if (extension === 'fit') {
    const buffer = await file.arrayBuffer();
    return parseFIT(buffer, color, filename);
  } else {
    throw new Error(`Unsupported file type: ${extension}`);
  }
}
