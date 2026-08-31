// File parsing utilities for GPX and FIT files

import {
  Coordinate,
  haversineDistance,
  validateCoordinate,
  validateElevation,
  validateTimestamp,
  calculateDistance,
  isUsableDistanceChannel,
  deviceTotalDistance,
  GPS_VALIDATION,
} from './gps';
import { calculateElevationStats, cleanGPSData, rollingMedian } from './stats';
import {
  RouteData,
  ParsedRawData,
  ValidatedData,
  RouteStats,
  SessionSummary,
  DistanceSource,
  DurationSource,
  ZoneBoundary,
} from './types';
import { buildBatteryLevels } from './fit-battery';

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
export interface RouteExtras
  extends Partial<
    Pick<
      RouteData,
      | 'temperatures'
      | 'batteryLevels'
      | 'gpsAccuracies'
      | 'gpsElevations'
      | 'hrZoneBoundaries'
      | 'powerZoneBoundaries'
    >
  > {
  /** The device's per-record odometer in km, aligned with `coordinates`. */
  distances?: number[];
  sessionSummary?: SessionSummary | null;
}

/**
 * How far apart the record odometer and the session total may be before we
 * stop believing the channel. They describe the same run and should agree to
 * well under a percent; a gross mismatch means one of them is not in the units
 * we think, so drop the per-point channel rather than plot it.
 */
const DISTANCE_CHANNEL_TOLERANCE = 0.25;

export function createRouteData(
  filename: string,
  color: string,
  coordinates: Coordinate[],
  elevations: (number | null)[],
  timestamps: (Date | null)[],
  heartRates: (number | null)[],
  cadences: (number | null)[],
  powers: (number | null)[],
  speeds: (number | null)[],
  paces: (number | null)[],
  extras: RouteExtras = {}
): RouteData {
  const elevStats = calculateElevationStats(elevations);

  // Distance and duration recomputed from the raw GPS track. These are no
  // longer the headline numbers, but they are what the session self-check
  // measures the device's self-reported totals against — so they have to stay
  // available and stay purely track-derived.
  const gpsDistance = calculateDistance(coordinates);

  let gpsDuration: number | null = null;
  const validTimestamps = timestamps.filter((t): t is Date => t !== null);
  if (validTimestamps.length >= 2) {
    gpsDuration =
      (validTimestamps[validTimestamps.length - 1].getTime() -
        validTimestamps[0].getTime()) /
      1000;
  }

  // A Haversine sum over the track accumulates GPS jitter as real distance and
  // chords straight across any stretch where the fix was lost (those records
  // are dropped for having no lat/lng). The device's own figure fuses GPS with
  // the accelerometer/footpod, spans dropouts, and is what the watch showed —
  // so prefer it, session message first, then the record odometer, and fall
  // back to the track only when neither is present (GPX, and FIT without them).
  let deviceDistances = extras.distances ?? [];
  const recordTotal = deviceTotalDistance(deviceDistances);
  const sessionTotal = extras.sessionSummary?.totalDistanceKm ?? null;

  if (
    sessionTotal !== null &&
    recordTotal !== null &&
    sessionTotal > 0 &&
    Math.abs(recordTotal - sessionTotal) / sessionTotal > DISTANCE_CHANNEL_TOLERANCE
  ) {
    console.warn(
      `${filename}: record distance channel (${recordTotal.toFixed(2)} km) disagrees with ` +
        `session total (${sessionTotal.toFixed(2)} km) — ignoring the channel.`
    );
    deviceDistances = [];
  }

  let distance: number;
  let distanceSource: DistanceSource;
  if (sessionTotal !== null) {
    distance = sessionTotal;
    distanceSource = 'session';
  } else if (recordTotal !== null && deviceDistances.length > 0) {
    distance = recordTotal;
    distanceSource = 'record';
  } else {
    distance = gpsDistance;
    distanceSource = 'gps';
  }

  // Elapsed time, same precedence: the session message covers the whole
  // recording, whereas the track-derived figure silently starts at the first
  // GPS fix and so loses any pre-lock portion.
  let duration: number | null;
  let durationSource: DurationSource;
  if (extras.sessionSummary?.totalElapsedSeconds != null) {
    duration = extras.sessionSummary.totalElapsedSeconds;
    durationSource = 'session';
  } else {
    duration = gpsDuration;
    durationSource = 'gps';
  }

  // Ascent and descent stay recomputed on purpose. Device ascent is barometric
  // and calibrated per-device, so comparing two watches on their own numbers
  // compares their barometers rather than the route.
  const stats: RouteStats = {
    distance,
    elevationGain: elevStats.gain,
    elevationLoss: elevStats.loss,
    minElevation: elevStats.min,
    maxElevation: elevStats.max,
    duration,
    distanceSource,
    durationSource,
    gpsDistance,
    gpsDuration,
    movingTime: extras.sessionSummary?.totalTimerSeconds ?? null,
  };

  // Only carry the channel onward if it can safely be indexed against.
  const usableDistances = isUsableDistanceChannel(deviceDistances, coordinates.length)
    ? deviceDistances
    : undefined;

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
    // Only attach a series if it actually carried a value — an all-null array
    // would light up a chart option with nothing behind it.
    ...(extras.temperatures?.some((v) => v !== null) ? { temperatures: extras.temperatures } : {}),
    ...(extras.batteryLevels?.some((v) => v !== null) ? { batteryLevels: extras.batteryLevels } : {}),
    ...(extras.gpsAccuracies?.some((v) => v !== null) ? { gpsAccuracies: extras.gpsAccuracies } : {}),
    ...(extras.gpsElevations?.some((v) => v !== null) ? { gpsElevations: extras.gpsElevations } : {}),
    ...(usableDistances ? { distances: usableDistances } : {}),
    ...(extras.hrZoneBoundaries ? { hrZoneBoundaries: extras.hrZoneBoundaries } : {}),
    ...(extras.powerZoneBoundaries ? { powerZoneBoundaries: extras.powerZoneBoundaries } : {}),
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

const HR_ZONE_NAMES = ['Warm Up', 'Easy', 'Aerobic', 'Threshold', 'Maximum'];
const POWER_ZONE_NAMES = ['Recovery', 'Endurance', 'Tempo', 'Threshold', 'Max'];

/** Percentages of HRR (or of max HR) that bound the five classic HR zones. */
const HR_ZONE_PERCENTS = [0.6, 0.7, 0.8, 0.9, 1.0];
/** Percentages of functional threshold power bounding the five power zones. */
const POWER_ZONE_PERCENTS = [0.55, 0.75, 0.9, 1.05, 1.2];

/**
 * The parts of a parsed FIT file this module reads. Declared structurally
 * rather than typed as the whole parser output, which is untyped and vast.
 */
interface FitData {
  sessions?: {
    total_distance?: number | null;
    total_elapsed_time?: number | null;
    total_timer_time?: number | null;
    total_ascent?: number | null;
    total_descent?: number | null;
  }[];
  time_in_zone?: { hr_zone_high_boundary?: (number | null)[] }[];
  time_in_zones?: { hr_zone_high_boundary?: (number | null)[] }[];
  hr_zone?: { message_index?: number; high_bpm?: number | null; name?: string | null }[];
  hr_zones?: { message_index?: number; high_bpm?: number | null; name?: string | null }[];
  zones_target?: {
    max_heart_rate?: number | null;
    hr_calc_type?: string | null;
    functional_threshold_power?: number | null;
    pwr_calc_type?: string | null;
  };
  user_profile?: {
    resting_heart_rate?: number | null;
    functional_threshold_power?: number | null;
  };
}

/**
 * The device's own totals for the activity.
 *
 * Kept deliberately separate from the record stream: these are what the watch
 * displayed, and the record stream is what it plotted.
 */
export function extractSessionSummary(data: FitData): SessionSummary | null {
  const session = (data?.sessions || [])[0];
  if (!session) return null;

  const totalDistanceKm =
    session.total_distance !== undefined && session.total_distance !== null
      ? session.total_distance / 1000
      : null;
  const totalElapsedSeconds = session.total_elapsed_time ?? session.total_timer_time ?? null;
  // Timer time excludes auto-pause, so it is the "moving time" counterpart to
  // elapsed. Kept separate rather than folded into totalElapsedSeconds, which
  // must stay elapsed for the session self-check to mean anything.
  const totalTimerSeconds = session.total_timer_time ?? null;

  if (totalDistanceKm === null && totalElapsedSeconds === null) return null;

  return {
    totalDistanceKm,
    totalElapsedSeconds,
    totalTimerSeconds,
    totalAscent: session.total_ascent ?? null,
    totalDescent: session.total_descent ?? null,
  };
}

/**
 * The heart rate zone boundaries the device itself used.
 *
 * Anchoring zones to the activity's observed maximum makes every easy run look
 * hard: a 103 km ultra whose HR never passed 152 against a true max of 178 was
 * reported as 15.9% at Threshold when the device scored it 0%. The file has
 * the real numbers; this reads them, in descending order of directness.
 */
export function buildHrZoneBoundaries(data: FitData): ZoneBoundary[] | null {
  // 1. time_in_zone messages carry the exact boundaries the device applied.
  const tiz = data?.time_in_zone || data?.time_in_zones || [];
  if (tiz.length > 0 && tiz[0].hr_zone_high_boundary) {
    const highs = tiz[0].hr_zone_high_boundary!.filter((v): v is number => v != null);
    if (highs.length >= 2) {
      return highs
        .slice(0, 5)
        .map((high, i) => ({ high, name: HR_ZONE_NAMES[i] ?? `Zone ${i + 1}` }));
    }
  }

  // 2. Explicit hr_zone messages, which some devices write instead.
  const hrZones = data?.hr_zones || data?.hr_zone || [];
  if (hrZones.length >= 2) {
    const sorted = [...hrZones].sort(
      (a, b) => (a.message_index ?? 0) - (b.message_index ?? 0)
    );
    const boundaries = sorted
      .filter((z) => z.high_bpm != null)
      .map((z, i) => ({ high: z.high_bpm as number, name: z.name ?? HR_ZONE_NAMES[i] ?? null }));
    if (boundaries.length >= 2) return boundaries;
  }

  // 3. Compute from the user's configured max, against resting HR where the
  //    device works in percent of heart rate reserve.
  const zt = data?.zones_target;
  if (!zt || !zt.max_heart_rate) return null;
  const maxHR = zt.max_heart_rate;
  const restingHR = data?.user_profile?.resting_heart_rate ?? null;

  if (zt.hr_calc_type === 'percent_hrr' && restingHR != null) {
    const hrr = maxHR - restingHR;
    return HR_ZONE_PERCENTS.map((pct, i) => ({
      high: Math.round(restingHR + hrr * pct),
      name: HR_ZONE_NAMES[i],
    }));
  }

  return HR_ZONE_PERCENTS.map((pct, i) => ({
    high: Math.round(maxHR * pct),
    name: HR_ZONE_NAMES[i],
  }));
}

/** Power zones as percentages of the device's recorded FTP. */
export function buildPowerZoneBoundaries(data: FitData): ZoneBoundary[] | null {
  const ftp =
    data?.zones_target?.functional_threshold_power ??
    data?.user_profile?.functional_threshold_power ??
    null;
  if (!ftp) return null;

  return POWER_ZONE_PERCENTS.map((pct, i) => ({
    high: Math.round(ftp * pct),
    name: POWER_ZONE_NAMES[i],
  }));
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
      const temperatures: (number | null)[] = [];
      const gpsAccuracies: (number | null)[] = [];
      const gpsElevations: (number | null)[] = [];
      const batterySoc: (number | null)[] = [];
      const distances: (number | null)[] = [];

      records.forEach((record: Record<string, unknown>) => {
        const lat = record.position_lat as number | undefined;
        const lng = record.position_long as number | undefined;

        if (lat !== undefined && lng !== undefined) {
          const coordResult = validateCoordinate(lat, lng);
          if (coordResult.valid) {
            coordinates.push({ lat, lng });
            // The device's own cumulative odometer. Parsed under lengthUnit
            // 'm', so this is metres — normalised to km to match every other
            // distance in the app, and sanity-checked against the session
            // total in createRouteData in case those units ever shift.
            const recordDistance = record.distance as number | undefined;
            distances.push(
              recordDistance !== undefined && recordDistance !== null
                ? recordDistance / 1000
                : null
            );
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

            temperatures.push((record.temperature as number) ?? null);
            gpsAccuracies.push((record.gps_accuracy as number) ?? null);
            // Plain `altitude` is GPS-derived; `enhanced_altitude` is the
            // barometric/corrected figure that went into `elevations`.
            gpsElevations.push((record.altitude as number) ?? null);
            batterySoc.push(
              (record.battery_soc as number) ?? (record.battery_level as number) ?? null
            );
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

      // Only keep GPS altitude when it genuinely differs from the barometric
      // series — on devices without a barometer the two are the same array and
      // a dual-elevation overlay would just draw the same line twice.
      const dualElevation = gpsElevations.filter(
        (v, i) => v !== null && elevations[i] !== null && Math.abs(v - elevations[i]!) > 0.1
      ).length > gpsElevations.length * 0.1;

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
          smoothedPaces,
          {
            temperatures,
            gpsAccuracies,
            batteryLevels: buildBatteryLevels(batterySoc, timestamps, arrayBuffer),
            gpsElevations: dualElevation ? gpsElevations : undefined,
            distances: distances as number[],
            sessionSummary: extractSessionSummary(data),
            hrZoneBoundaries: buildHrZoneBoundaries(data) ?? undefined,
            powerZoneBoundaries: buildPowerZoneBoundaries(data) ?? undefined,
          }
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
