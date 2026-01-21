/**
 * Comparison data and ranking logic for running times.
 *
 * Data sources:
 * - Parkrun averages: parkrun.org.uk statistics
 * - Distance averages & percentiles: RunRepeat.com analysis of 107.9M race results
 * - Age grading: WMA 2023 factors (from database)
 */

// Time conversion utilities
export function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr || timeStr === '--') return null;

  const cleaned = timeStr.trim().replace(/[a-zA-Z]$/, '');
  const parts = cleaned.split(':');

  try {
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
  } catch {
    return null;
  }

  return null;
}

export function secondsToTimeStr(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Parkrun averages (in seconds)
export const PARKRUN_AVERAGES = {
  global: {
    name: 'Global Parkrun Average',
    time: parseTimeToSeconds('32:00')!,
    description: 'Average across all 2,600+ parkrun events worldwide',
  },
  uk: {
    name: 'UK Parkrun Average',
    time: parseTimeToSeconds('29:30')!,
    description: 'Average across UK parkrun events',
  },
  uk_male: {
    name: 'UK Male Average',
    time: parseTimeToSeconds('30:29')!,
    description: 'Average for male parkrunners in the UK',
  },
  uk_female: {
    name: 'UK Female Average',
    time: parseTimeToSeconds('33:52')!,
    description: 'Average for female parkrunners in the UK',
  },
};

// Global race averages by distance (from RunRepeat 107.9M race results)
export const DISTANCE_AVERAGES = {
  '5k': {
    name: '5K',
    distanceKm: 5,
    male: parseTimeToSeconds('31:28')!,
    female: parseTimeToSeconds('37:28')!,
    overall: parseTimeToSeconds('34:00')!,
  },
  '10k': {
    name: '10K',
    distanceKm: 10,
    male: parseTimeToSeconds('57:15')!,
    female: parseTimeToSeconds('1:06:54')!,
    overall: parseTimeToSeconds('1:02:08')!,
  },
  half: {
    name: 'Half Marathon',
    distanceKm: 21.1,
    male: parseTimeToSeconds('1:59:26')!,
    female: parseTimeToSeconds('2:14:40')!,
    overall: parseTimeToSeconds('2:05:00')!,
  },
  marathon: {
    name: 'Marathon',
    distanceKm: 42.2,
    male: parseTimeToSeconds('4:21:03')!,
    female: parseTimeToSeconds('4:48:45')!,
    overall: parseTimeToSeconds('4:32:49')!,
  },
};

// 5K times by ability level and age (from runninglevel.com)
const MALE_5K_TIMES: Record<number, Record<string, number>> = {
  20: { beginner: 1889, novice: 1620, intermediate: 1351, advanced: 1184, elite: 1060 },
  25: { beginner: 1889, novice: 1605, intermediate: 1338, advanced: 1172, elite: 1049 },
  30: { beginner: 1889, novice: 1612, intermediate: 1344, advanced: 1177, elite: 1053 },
  35: { beginner: 1925, novice: 1642, intermediate: 1369, advanced: 1199, elite: 1073 },
  40: { beginner: 1989, novice: 1697, intermediate: 1423, advanced: 1246, elite: 1116 },
  45: { beginner: 2072, novice: 1768, intermediate: 1472, advanced: 1289, elite: 1154 },
  50: { beginner: 2168, novice: 1850, intermediate: 1541, advanced: 1349, elite: 1208 },
  55: { beginner: 2278, novice: 1942, intermediate: 1618, advanced: 1416, elite: 1268 },
  60: { beginner: 2333, novice: 1990, intermediate: 1669, advanced: 1462, elite: 1309 },
  65: { beginner: 2547, novice: 2172, intermediate: 1809, advanced: 1584, elite: 1418 },
  70: { beginner: 2797, novice: 2386, intermediate: 1988, advanced: 1741, elite: 1558 },
};

const FEMALE_5K_TIMES: Record<number, Record<string, number>> = {
  20: { beginner: 2127, novice: 1842, intermediate: 1567, advanced: 1384, elite: 1247 },
  25: { beginner: 2127, novice: 1825, intermediate: 1552, advanced: 1371, elite: 1235 },
  30: { beginner: 2127, novice: 1833, intermediate: 1559, advanced: 1377, elite: 1241 },
  35: { beginner: 2147, novice: 1850, intermediate: 1573, advanced: 1390, elite: 1252 },
  40: { beginner: 2185, novice: 1883, intermediate: 1609, advanced: 1422, elite: 1282 },
  45: { beginner: 2289, novice: 1973, intermediate: 1678, advanced: 1482, elite: 1336 },
  50: { beginner: 2419, novice: 2084, intermediate: 1772, advanced: 1565, elite: 1410 },
  55: { beginner: 2574, novice: 2217, intermediate: 1885, advanced: 1665, elite: 1500 },
  60: { beginner: 2669, novice: 2298, intermediate: 1967, advanced: 1738, elite: 1566 },
  65: { beginner: 2943, novice: 2535, intermediate: 2156, advanced: 1904, elite: 1716 },
  70: { beginner: 3267, novice: 2815, intermediate: 2394, advanced: 2115, elite: 1906 },
};

// Percentile thresholds by distance (from RunRepeat 107.9M race results)
const PERCENTILE_THRESHOLDS_5K: [number, number][] = [
  [900, 99.9],   // Sub-15: Top 0.1%
  [1050, 99],    // Sub-17:30: Top 1%
  [1140, 97],    // Sub-19: Top 3%
  [1200, 95],    // Sub-20: Top 5%
  [1260, 93],    // Sub-21: Top 7%
  [1320, 91],    // Sub-22: Top 9%
  [1380, 90],    // Sub-23: Top 10%
  [1500, 90],    // Sub-25: Top 10% overall
  [1620, 80],    // Sub-27: Top 20%
  [1680, 75],    // Sub-28: Top 25%
  [1800, 70],    // Sub-30: Top 30%
  [1920, 60],    // Sub-32: Top 40%
  [2040, 50],    // Sub-34: Median
  [2220, 40],    // Sub-37: Top 60%
  [2400, 30],    // Sub-40: Top 70%
  [2700, 20],    // Sub-45: Top 80%
  [3000, 12],    // Sub-50: Top 88%
  [3300, 7],     // Sub-55: Top 93%
  [3600, 4],     // Sub-60: Top 96%
];

const PERCENTILE_THRESHOLDS_10K: [number, number][] = [
  [1920, 99.9],  // Sub-32: Top 0.1%
  [2100, 99],    // Sub-35: Top 1%
  [2400, 97],    // Sub-40: Top 3%
  [2700, 93],    // Sub-45: Top 7%
  [2891, 90],    // Sub-48:11: Top 10%
  [3120, 80],    // Sub-52: Top 20%
  [3300, 70],    // Sub-55: Top 30%
  [3480, 65],    // Sub-58: Top 35%
  [3600, 60],    // Sub-60: Top 40%
  [3728, 50],    // Global average = median
  [4200, 35],    // Sub-70min: Top 65%
  [4800, 20],    // Sub-80min: Top 80%
  [5400, 10],    // Sub-90min: Top 90%
];

const PERCENTILE_THRESHOLDS_HALF: [number, number][] = [
  [4200, 99.9],  // Sub-1:10: Top 0.1%
  [5039, 99],    // Sub-1:24: Top 1%
  [5400, 97],    // Sub-1:30: Top 3%
  [6000, 93],    // Sub-1:40: Top 7%
  [6430, 90],    // Sub-1:47:10: Top 10%
  [6600, 85],    // Sub-1:50: Top 15%
  [6900, 70],    // Sub-1:55: Top 30%
  [7200, 55],    // Sub-2:00: Top 45%
  [7500, 50],    // ~Global average = median
  [8100, 40],    // Sub-2:15: Top 60%
  [9000, 25],    // Sub-2:30: Top 75%
  [9900, 15],    // Sub-2:45: Top 85%
  [10800, 8],    // Sub-3:00: Top 92%
];

const PERCENTILE_THRESHOLDS_MARATHON: [number, number][] = [
  [9000, 99.9],  // Sub-2:30: Top 0.1%
  [10248, 99],   // Sub-2:51: Top 1%
  [10800, 97],   // Sub-3:00: Top 3%
  [11700, 93],   // Sub-3:15: Top 7%
  [12706, 90],   // Sub-3:32: Top 10%
  [13500, 80],   // Sub-3:45: Top 20%
  [14400, 70],   // Sub-4:00: Top 30%
  [15300, 55],   // Sub-4:15: Top 45%
  [15993, 50],   // Median
  [17100, 40],   // Sub-4:45: Top 60%
  [18000, 30],   // Sub-5:00: Top 70%
  [19800, 18],   // Sub-5:30: Top 82%
  [21600, 10],   // Sub-6:00: Top 90%
];

const PERCENTILE_MAPS: Record<string, [number, number][]> = {
  '5k': PERCENTILE_THRESHOLDS_5K,
  '10k': PERCENTILE_THRESHOLDS_10K,
  half: PERCENTILE_THRESHOLDS_HALF,
  marathon: PERCENTILE_THRESHOLDS_MARATHON,
};

export function getPercentile(timeSeconds: number, distance: string = '5k'): number {
  const thresholds = PERCENTILE_MAPS[distance.toLowerCase()] || PERCENTILE_THRESHOLDS_5K;

  for (const [threshold, percentile] of thresholds) {
    if (timeSeconds <= threshold) {
      return percentile;
    }
  }

  return 1.0;
}

export function getAbilityLevel(
  timeSeconds: number,
  age: number = 30,
  gender: 'male' | 'female' = 'male'
): string {
  const timesTable = gender === 'male' ? MALE_5K_TIMES : FEMALE_5K_TIMES;
  const ages = Object.keys(timesTable).map(Number).sort((a, b) => a - b);

  const closestAge = ages.reduce((prev, curr) =>
    Math.abs(curr - age) < Math.abs(prev - age) ? curr : prev
  );

  const thresholds = timesTable[closestAge];

  if (timeSeconds <= thresholds.elite) return 'elite';
  if (timeSeconds <= thresholds.advanced) return 'advanced';
  if (timeSeconds <= thresholds.intermediate) return 'intermediate';
  if (timeSeconds <= thresholds.novice) return 'novice';
  return 'beginner';
}

export function getRatingMessage(percentile: number): string {
  if (percentile >= 99) return "Incredible! You're among the fastest parkrunners in the world!";
  if (percentile >= 95) return "Outstanding! You're an elite-level runner!";
  if (percentile >= 90) return "Excellent! You're faster than 90% of parkrunners!";
  if (percentile >= 80) return "Great job! You're a strong runner, faster than 80% of participants!";
  if (percentile >= 70) return "Well done! You're faster than most parkrunners!";
  if (percentile >= 50) return "Good going! You're faster than the average parkrunner!";
  if (percentile >= 30) return "Keep it up! Every parkrun makes you stronger!";
  return "You're doing great! The important thing is you're out there running!";
}

export interface ParkrunComparison {
  category: string;
  name: string;
  benchmarkTime: string;
  benchmarkSeconds: number;
  difference: number;
  differenceStr: string;
  faster: boolean;
  description: string;
}

export function compareToAverages(timeSeconds: number): ParkrunComparison[] {
  return Object.entries(PARKRUN_AVERAGES).map(([, data]) => {
    const diff = data.time - timeSeconds;
    return {
      category: 'Parkrun',
      name: data.name,
      benchmarkTime: secondsToTimeStr(data.time),
      benchmarkSeconds: data.time,
      difference: Math.abs(diff),
      differenceStr: secondsToTimeStr(Math.abs(diff)),
      faster: diff > 0,
      description: data.description,
    };
  });
}

export interface DistanceComparison {
  distance: string;
  name: string;
  averageTime: string;
  averageSeconds: number;
  difference: number;
  differenceStr: string;
  faster: boolean;
  source: string;
}

export function compareToDistanceAverage(
  timeSeconds: number,
  distance: string = '5k',
  gender?: 'male' | 'female'
): DistanceComparison | null {
  const distData = DISTANCE_AVERAGES[distance.toLowerCase() as keyof typeof DISTANCE_AVERAGES];
  if (!distData) return null;

  const avgTime = gender ? distData[gender] : distData.overall;
  const label = gender
    ? `Global ${distData.name} Average (${gender.charAt(0).toUpperCase() + gender.slice(1)})`
    : `Global ${distData.name} Average`;

  const diff = avgTime - timeSeconds;

  return {
    distance,
    name: label,
    averageTime: secondsToTimeStr(avgTime),
    averageSeconds: avgTime,
    difference: Math.abs(diff),
    differenceStr: secondsToTimeStr(Math.abs(diff)),
    faster: diff > 0,
    source: 'RunRepeat (107.9M race results)',
  };
}

export interface FullComparison {
  timeSeconds: number;
  timeStr: string;
  percentile: number;
  abilityLevel: string;
  ratingMessage: string;
  parkrunComparisons: ParkrunComparison[];
  distanceComparison: DistanceComparison | null;
}

export function getFullComparison(
  timeSeconds: number,
  age?: number,
  gender?: 'male' | 'female',
  distance: string = '5k'
): FullComparison {
  const percentile = getPercentile(timeSeconds, distance);
  const effectiveAge = age || 35;
  const effectiveGender = gender || 'male';
  const ability = getAbilityLevel(timeSeconds, effectiveAge, effectiveGender);
  const distanceComparison = compareToDistanceAverage(timeSeconds, distance, effectiveGender);

  return {
    timeSeconds,
    timeStr: secondsToTimeStr(timeSeconds),
    percentile,
    abilityLevel: ability,
    ratingMessage: getRatingMessage(percentile),
    parkrunComparisons: compareToAverages(timeSeconds),
    distanceComparison,
  };
}
