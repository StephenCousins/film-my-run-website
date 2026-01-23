// Route Comparison library exports

// Types
export * from './types';

// GPS utilities
export {
  toRad,
  haversineDistance,
  calculateDistance,
  buildCumulativeDistances,
  findIndexAtDistance,
  validateCoordinate,
  validateElevation,
  validateTimestamp,
  GPS_VALIDATION,
} from './gps';

// Statistics and data processing
export {
  calculateElevationStats,
  median,
  calculateMAD,
  smoothData,
  rollingMedian,
  decimateData,
  getAdaptiveSmoothingParams,
  filterOutliersIQR,
  filterOutliersMAD,
  filterAccelerationSpikes,
  filterDistanceJumps,
  cleanGPSData,
} from './stats';

// Formatting utilities
export {
  formatDistance,
  formatElevation,
  formatDuration,
  formatBreakDuration,
  formatHeartRate,
  formatPace,
  formatCadence,
  formatTimeDelta,
  formatSplitPace,
  formatSplitElevation,
  formatSplitHR,
  formatSplitTime,
  formatSplitGap,
  formatSegmentDuration,
  getDistanceLabel,
  ROUTE_COLORS,
  getNextColor,
  interpolateColor,
  getPaceColor,
} from './formatting';

// Analysis functions
export {
  calculateSplitPace,
  calculateSplitElevGain,
  calculateSplitElevLoss,
  calculateSplitAvg,
  calculateSplits,
  calculateBestEfforts,
  calculateZones,
  buildTimeDistanceMap,
  getTimeAtDistance,
  calculateTimeGaps,
  calculateGrades,
  detectSteepSections,
  calculateEffortScore,
} from './analysis';

// File parsing
export {
  validateParsedData,
  parseGPX,
  parseFIT,
  parseFile,
} from './file-parser';
