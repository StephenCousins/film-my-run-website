// Analysis utilities: splits, best efforts, zones, time gaps

import { Coordinate, haversineDistance, buildCumulativeDistances, findIndexAtDistance } from './gps';
import { RouteData, Split, BestEffort, Zone, ZoneAnalysis, TimeGapResult, GradePoint, SteepSection } from './types';

/**
 * Calculate pace for a split segment
 */
export function calculateSplitPace(
  route: RouteData,
  startIdx: number,
  endIdx: number
): number | null {
  if (!route.timestamps || startIdx >= endIdx) return null;

  const startTime = route.timestamps[startIdx];
  const endTime = route.timestamps[endIdx];

  if (!startTime || !endTime) return null;

  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  if (durationSeconds <= 0) return null;

  let segmentDistance = 0;
  for (let i = startIdx + 1; i <= endIdx; i++) {
    segmentDistance += haversineDistance(
      route.coordinates[i - 1],
      route.coordinates[i]
    );
  }

  if (segmentDistance <= 0) return null;

  const paceMinPerKm = durationSeconds / 60 / segmentDistance;
  return paceMinPerKm > 0 && paceMinPerKm < 30 ? paceMinPerKm : null;
}

/**
 * Calculate elevation gain for a split segment
 */
export function calculateSplitElevGain(
  elevations: (number | null)[],
  startIdx: number,
  endIdx: number
): number {
  if (!elevations || startIdx >= endIdx) return 0;

  let gain = 0;
  for (let i = startIdx + 1; i <= endIdx; i++) {
    const prev = elevations[i - 1];
    const curr = elevations[i];
    if (prev !== null && curr !== null && !isNaN(prev) && !isNaN(curr)) {
      const diff = curr - prev;
      if (diff > 0) gain += diff;
    }
  }
  return gain;
}

/**
 * Calculate elevation loss for a split segment
 */
export function calculateSplitElevLoss(
  elevations: (number | null)[],
  startIdx: number,
  endIdx: number
): number {
  if (!elevations || startIdx >= endIdx) return 0;

  let loss = 0;
  for (let i = startIdx + 1; i <= endIdx; i++) {
    const prev = elevations[i - 1];
    const curr = elevations[i];
    if (prev !== null && curr !== null && !isNaN(prev) && !isNaN(curr)) {
      const diff = curr - prev;
      if (diff < 0) loss += Math.abs(diff);
    }
  }
  return loss;
}

/**
 * Calculate average value for a split segment
 */
export function calculateSplitAvg(
  arr: (number | null)[] | undefined,
  startIdx: number,
  endIdx: number
): number | null {
  if (!arr || startIdx >= endIdx) return null;

  const segment = arr.slice(startIdx, endIdx + 1);
  const valid = segment.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v)
  );

  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Calculate splits for a route
 */
export function calculateSplits(
  route: RouteData,
  splitDistanceKm = 1.0
): Split[] {
  if (!route || !route.coordinates || route.coordinates.length < 2) {
    return [];
  }

  const distances = buildCumulativeDistances(route.coordinates);
  const totalDistance = distances[distances.length - 1];
  const splits: Split[] = [];
  let splitNum = 1;
  let currentKm = 0;

  while (currentKm < totalDistance) {
    const startKm = currentKm;
    const endKm = Math.min(currentKm + splitDistanceKm, totalDistance);
    const isPartialSplit = endKm - startKm < splitDistanceKm * 0.9;

    const startIdx = findIndexAtDistance(distances, startKm);
    const endIdx = findIndexAtDistance(distances, endKm);

    let duration: number | null = null;
    if (route.timestamps && route.timestamps[startIdx] && route.timestamps[endIdx]) {
      duration =
        (route.timestamps[endIdx]!.getTime() - route.timestamps[startIdx]!.getTime()) / 1000;
    }

    const split: Split = {
      number: splitNum,
      startKm,
      endKm,
      distance: endKm - startKm,
      isPartial: isPartialSplit,
      duration,
      pace: calculateSplitPace(route, startIdx, endIdx),
      elevGain: calculateSplitElevGain(route.elevations, startIdx, endIdx),
      avgHR: calculateSplitAvg(route.heartRates, startIdx, endIdx),
    };

    splits.push(split);
    currentKm += splitDistanceKm;
    splitNum++;
  }

  return splits;
}

/**
 * Calculate best efforts for standard distances
 */
export function calculateBestEfforts(
  route: RouteData,
  targetDistances = [1, 5, 10, 21.1, 42.195]
): BestEffort[] {
  const routeDistance = route.stats.distance;
  const validDistances = targetDistances.filter((d) => d <= routeDistance);

  if (validDistances.length === 0) return [];

  const cumulativeDistances = buildCumulativeDistances(route.coordinates);
  const bestEfforts: BestEffort[] = [];

  for (const targetDistance of validDistances) {
    let bestPace = Infinity;
    let bestStartKm = 0;
    let bestDuration = 0;
    let bestElevGain = 0;
    let bestStartIdx = 0;
    let bestEndIdx = 0;

    for (let i = 0; i < cumulativeDistances.length; i++) {
      const startKm = cumulativeDistances[i];
      const endKm = startKm + targetDistance;

      if (endKm > routeDistance + 0.01) break;

      const endIdx = findIndexAtDistance(cumulativeDistances, endKm);
      if (endIdx >= route.coordinates.length) continue;

      const startTime = route.timestamps?.[i];
      const endTime = route.timestamps?.[endIdx];
      if (!startTime || !endTime) continue;

      const durationSec = (endTime.getTime() - startTime.getTime()) / 1000;
      if (durationSec <= 0) continue;

      const pace = durationSec / 60 / targetDistance;

      if (pace < bestPace && pace > 0) {
        bestPace = pace;
        bestStartKm = startKm;
        bestDuration = durationSec;
        bestStartIdx = i;
        bestEndIdx = endIdx;
        bestElevGain = calculateSplitElevGain(route.elevations, i, endIdx);
      }
    }

    if (bestPace < Infinity) {
      bestEfforts.push({
        distance: targetDistance,
        distanceLabel:
          targetDistance === 21.1
            ? 'Half Marathon'
            : targetDistance === 42.195
              ? 'Marathon'
              : targetDistance < 1
                ? `${Math.round(targetDistance * 1000)}m`
                : `${targetDistance}km`,
        pace: bestPace,
        duration: bestDuration,
        startKm: bestStartKm,
        elevGain: bestElevGain,
        startIdx: bestStartIdx,
        endIdx: bestEndIdx,
      });
    }
  }

  return bestEfforts;
}

/**
 * Calculate zone distribution for a metric
 */
export function calculateZones(
  values: (number | null)[],
  timestamps: (Date | null)[] | undefined,
  metricType = 'heartRate'
): ZoneAnalysis | null {
  const validValues = values.filter((v): v is number => v !== null && v > 0);
  if (validValues.length < 10) return null;

  const minVal = Math.min(...validValues);
  const maxVal = Math.max(...validValues);
  const range = maxVal - minVal;

  if (range === 0) return null;

  const zoneNames = ['Recovery', 'Endurance', 'Tempo', 'Threshold', 'Max'];
  const zoneColors = ['#34A853', '#4285F4', '#FBBC04', '#FF9800', '#EA4335'];

  const zones: Zone[] = [];
  for (let i = 0; i < 5; i++) {
    zones.push({
      zone: i + 1,
      name: zoneNames[i],
      color: zoneColors[i],
      min: Math.round(minVal + range * (i * 0.2)),
      max: Math.round(minVal + range * ((i + 1) * 0.2)),
      time: 0,
      points: 0,
      percent: 0,
    });
  }

  let totalTime = 0;
  const hasTimestamps = timestamps && timestamps.length === values.length;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val === null || val <= 0) continue;

    const normalized = (val - minVal) / range;
    const zoneIdx = Math.min(4, Math.floor(normalized * 5));

    let timeDelta = 1;
    if (hasTimestamps && i > 0 && timestamps[i] && timestamps[i - 1]) {
      timeDelta = (timestamps[i]!.getTime() - timestamps[i - 1]!.getTime()) / 1000;
      if (timeDelta < 0 || timeDelta > 60) timeDelta = 1;
    }

    zones[zoneIdx].time += timeDelta;
    zones[zoneIdx].points++;
    totalTime += timeDelta;
  }

  zones.forEach((z) => {
    z.percent = totalTime > 0 ? Math.round((z.time / totalTime) * 100) : 0;
  });

  const dominantZone = zones.reduce((max, z) => (z.time > max.time ? z : max), zones[0]);

  return {
    zones,
    totalTime,
    dominantZone: dominantZone.zone,
    metric: metricType,
    minVal,
    maxVal,
  };
}

/**
 * Build time-distance map for gap analysis
 */
export function buildTimeDistanceMap(
  route: RouteData
): { distances: number[]; times: number[] } | null {
  if (!route.timestamps || route.timestamps.length === 0) {
    return null;
  }

  const map = { distances: [0], times: [0] };
  const startTime = route.timestamps[0]?.getTime();
  if (!startTime) return null;

  let cumulativeDistance = 0;

  for (let i = 1; i < route.coordinates.length; i++) {
    const dist = haversineDistance(route.coordinates[i - 1], route.coordinates[i]);
    cumulativeDistance += dist;

    if (route.timestamps[i]) {
      const elapsedTime = (route.timestamps[i]!.getTime() - startTime) / 1000;
      map.distances.push(cumulativeDistance);
      map.times.push(elapsedTime);
    }
  }

  return map.distances.length > 1 ? map : null;
}

/**
 * Get time at a specific distance using interpolation
 */
export function getTimeAtDistance(
  map: { distances: number[]; times: number[] },
  targetDistance: number
): number | null {
  if (!map || map.distances.length < 2) return null;

  if (targetDistance > map.distances[map.distances.length - 1]) {
    return null;
  }

  if (targetDistance <= 0) {
    return 0;
  }

  let low = 0;
  let high = map.distances.length - 1;

  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (map.distances[mid] <= targetDistance) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const d1 = map.distances[low];
  const d2 = map.distances[high];
  const t1 = map.times[low];
  const t2 = map.times[high];

  if (d2 === d1) return t1;

  const ratio = (targetDistance - d1) / (d2 - d1);
  return t1 + ratio * (t2 - t1);
}

/**
 * Calculate time gaps between reference and comparison routes
 */
export function calculateTimeGaps(
  referenceRoute: RouteData,
  comparisonRoutes: RouteData[],
  sampleInterval = 0.1
): TimeGapResult | null {
  const refMap = buildTimeDistanceMap(referenceRoute);
  if (!refMap) return null;

  const compMaps = comparisonRoutes
    .map((r) => ({
      route: r,
      map: buildTimeDistanceMap(r),
    }))
    .filter((c) => c.map !== null) as { route: RouteData; map: NonNullable<ReturnType<typeof buildTimeDistanceMap>> }[];

  if (compMaps.length === 0) return null;

  const maxDistances = [refMap.distances[refMap.distances.length - 1]];
  compMaps.forEach((c) => {
    maxDistances.push(c.map.distances[c.map.distances.length - 1]);
  });
  const maxDist = Math.min(...maxDistances);

  const gaps: TimeGapResult['gaps'] = [];
  for (let d = 0; d <= maxDist; d += sampleInterval) {
    const refTime = getTimeAtDistance(refMap, d);
    if (refTime === null) continue;

    const point = {
      distance: d,
      referenceTime: refTime,
      comparisons: [] as { routeId: string; time: number; gap: number }[],
    };

    compMaps.forEach((c) => {
      const compTime = getTimeAtDistance(c.map, d);
      if (compTime !== null) {
        point.comparisons.push({
          routeId: c.route.id,
          time: compTime,
          gap: compTime - refTime,
        });
      }
    });

    if (point.comparisons.length > 0) {
      gaps.push(point);
    }
  }

  return {
    referenceRouteId: referenceRoute.id,
    gaps,
    maxDistance: maxDist,
  };
}

/**
 * Calculate grades along a route
 */
export function calculateGrades(route: RouteData): GradePoint[] {
  if (!route.elevations || route.elevations.length < 2) {
    return [];
  }

  const grades: GradePoint[] = [];
  const distances = buildCumulativeDistances(route.coordinates);

  for (let i = 1; i < route.coordinates.length; i++) {
    const dist = (distances[i] - distances[i - 1]) * 1000;
    const prevElev = route.elevations[i - 1];
    const currElev = route.elevations[i];

    if (prevElev !== null && currElev !== null && dist > 0) {
      const elevChange = currElev - prevElev;
      grades.push({
        grade: (elevChange / dist) * 100,
        distance: distances[i],
        elevChange,
      });
    } else {
      grades.push({
        grade: 0,
        distance: distances[i],
        elevChange: 0,
      });
    }
  }

  return grades;
}

/**
 * Detect steep climbing and descending sections
 */
export function detectSteepSections(
  route: RouteData,
  threshold = 5,
  minLength = 0.05
): { climbs: SteepSection[]; descents: SteepSection[] } {
  const grades = calculateGrades(route);
  if (grades.length === 0) return { climbs: [], descents: [] };

  const climbs: SteepSection[] = [];
  const descents: SteepSection[] = [];
  const distances = buildCumulativeDistances(route.coordinates);

  let currentSection: {
    type: 'climb' | 'descent';
    startKm: number;
    endKm: number;
    distance: number;
    elevChange: number;
    maxGrade: number;
    grades: number[];
  } | null = null;

  for (let i = 0; i < grades.length; i++) {
    const { grade, elevChange } = grades[i];
    const distKm = distances[i + 1];

    const isClimb = grade >= threshold;
    const isDescent = grade <= -threshold;

    if (isClimb || isDescent) {
      const type = isClimb ? 'climb' : 'descent';

      if (!currentSection || currentSection.type !== type) {
        if (currentSection && currentSection.distance >= minLength) {
          const section: SteepSection = {
            type: currentSection.type,
            startKm: currentSection.startKm,
            endKm: currentSection.endKm,
            distance: currentSection.distance,
            elevChange: Math.abs(currentSection.elevChange),
            maxGrade: currentSection.maxGrade,
            avgGrade: Math.abs(
              currentSection.grades.reduce((a, b) => a + b, 0) / currentSection.grades.length
            ),
          };
          if (currentSection.type === 'climb') {
            climbs.push(section);
          } else {
            descents.push(section);
          }
        }

        currentSection = {
          type,
          startKm: distances[i],
          endKm: distKm,
          distance: distKm - distances[i],
          elevChange,
          maxGrade: Math.abs(grade),
          grades: [grade],
        };
      } else {
        currentSection.endKm = distKm;
        currentSection.distance = currentSection.endKm - currentSection.startKm;
        currentSection.elevChange += elevChange;
        currentSection.maxGrade = Math.max(currentSection.maxGrade, Math.abs(grade));
        currentSection.grades.push(grade);
      }
    } else {
      if (currentSection && currentSection.distance >= minLength) {
        const section: SteepSection = {
          type: currentSection.type,
          startKm: currentSection.startKm,
          endKm: currentSection.endKm,
          distance: currentSection.distance,
          elevChange: Math.abs(currentSection.elevChange),
          maxGrade: currentSection.maxGrade,
          avgGrade: Math.abs(
            currentSection.grades.reduce((a, b) => a + b, 0) / currentSection.grades.length
          ),
        };
        if (currentSection.type === 'climb') {
          climbs.push(section);
        } else {
          descents.push(section);
        }
      }
      currentSection = null;
    }
  }

  if (currentSection && currentSection.distance >= minLength) {
    const section: SteepSection = {
      type: currentSection.type,
      startKm: currentSection.startKm,
      endKm: currentSection.endKm,
      distance: currentSection.distance,
      elevChange: Math.abs(currentSection.elevChange),
      maxGrade: currentSection.maxGrade,
      avgGrade: Math.abs(
        currentSection.grades.reduce((a, b) => a + b, 0) / currentSection.grades.length
      ),
    };
    if (currentSection.type === 'climb') {
      climbs.push(section);
    } else {
      descents.push(section);
    }
  }

  return { climbs, descents };
}

/**
 * Calculate effort score for a route
 */
export function calculateEffortScore(route: RouteData): {
  score: number;
  category: string;
  color: string;
  factorsUsed: number;
} {
  let score = 0;
  let factorsUsed = 0;

  // Duration factor (30%)
  if (route.stats.duration && route.stats.duration > 0) {
    const durationMins = route.stats.duration / 60;
    let durationScore: number;
    if (durationMins <= 30) {
      durationScore = (durationMins / 30) * 30;
    } else {
      durationScore = 30 + ((Math.min(durationMins, 90) - 30) / 60) * 70;
    }
    score += durationScore * 0.3;
    factorsUsed++;
  }

  // Distance factor (25%)
  if (route.stats.distance && route.stats.distance > 0) {
    const distKm = route.stats.distance;
    let distanceScore: number;
    if (distKm <= 5) {
      distanceScore = (distKm / 5) * 25;
    } else {
      distanceScore = 25 + ((Math.min(distKm, 20) - 5) / 15) * 75;
    }
    score += distanceScore * 0.25;
    factorsUsed++;
  }

  // Elevation factor (25%)
  if (route.stats.elevationGain && route.stats.elevationGain > 0) {
    const elevGain = route.stats.elevationGain;
    let elevationScore: number;
    if (elevGain <= 100) {
      elevationScore = (elevGain / 100) * 25;
    } else {
      elevationScore = 25 + ((Math.min(elevGain, 500) - 100) / 400) * 75;
    }
    score += elevationScore * 0.25;
    factorsUsed++;
  }

  // Pace factor (20%)
  if (route.paces && route.paces.length > 10) {
    const validPaces = route.paces.filter(
      (p): p is number => p !== null && p > 0 && p < 20
    );
    if (validPaces.length > 0) {
      const avgPace = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;
      const paceScore = Math.max(0, Math.min(100, ((8 - avgPace) / 4) * 100));
      score += paceScore * 0.2;
      factorsUsed++;
    }
  }

  if (factorsUsed > 0 && factorsUsed < 4) {
    score = score / (factorsUsed * 0.25);
  }

  score = Math.max(5, Math.min(100, Math.round(score)));

  let category: string;
  let color: string;
  if (score <= 25) {
    category = 'Easy';
    color = '#34A853';
  } else if (score <= 50) {
    category = 'Moderate';
    color = '#4285F4';
  } else if (score <= 75) {
    category = 'Hard';
    color = '#FF9800';
  } else {
    category = 'Very Hard';
    color = '#EA4335';
  }

  return { score, category, color, factorsUsed };
}
