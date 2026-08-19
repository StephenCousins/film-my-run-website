/**
 * Y-axis scaling for the route comparison charts.
 *
 * Ported from the standalone Route Overlay app. Recharts' default axis picks
 * bounds from the data, so a heart rate trace running 103-178 bpm produced
 * gridlines at 103, 118, 133… — technically correct, unreadable at a glance.
 * These helpers round the bounds out to whole multiples of a "nice" step so
 * the labels are numbers a person would have chosen.
 */

/**
 * Pace is labelled mm:ss, so a nice pace step is a round number of seconds
 * (5s, 15s, 30s, 1min…) rather than a round decimal of a minute.
 */
export const PACE_STEPS = [1 / 60, 2 / 60, 5 / 60, 10 / 60, 15 / 60, 30 / 60, 1, 2, 5];

/** Axes labelled as durations want round seconds and minutes — 90s beats 83s. */
export const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

/** Battery is read in whole percent — skip the 2.5 rung the generic scale picks. */
export const BATTERY_STEPS = [1, 2, 5, 10, 20, 25, 50];

export interface AxisOptions {
  /** Roughly how many gaps to aim for. */
  targetTicks?: number;
  /** Force fixed bounds, for a metric whose scale doesn't depend on the data. */
  min?: number;
  max?: number;
  /** Always start at zero. */
  zeroBased?: boolean;
  /**
   * Snap the floor to zero when the data already comes this close to it, as a
   * fraction of the max. Set 0 to never snap — right for heart rate and pace,
   * where zero isn't a meaningful floor and including it squashes the part of
   * the chart worth looking at.
   */
  snapZeroWithin?: number;
  /** Let the axis go below zero. */
  allowNegative?: boolean;
  /** Domain-specific step sizes, e.g. PACE_STEPS. */
  stepLadder?: number[] | null;
  /** Hard limits the rounded bounds can't cross (battery can't exceed 100%). */
  clampMin?: number;
  clampMax?: number;
  /**
   * Round the top up to this when it lands within one step of it, so a battery
   * reading 97% tops the axis at 100% rather than 98%.
   */
  preferMax?: number;
}

export interface Axis {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/**
 * Smallest "nice" step >= rawStep — 1, 2, 2.5 or 5 times a power of ten, so
 * gridlines land on numbers a human would have picked. Pass a ladder to use a
 * domain-specific set instead.
 */
export function niceStep(rawStep: number, ladder: number[] | null = null): number {
  if (!isFinite(rawStep) || rawStep <= 0) return 1;

  if (ladder && ladder.length) {
    for (const step of ladder) {
      if (step >= rawStep) return step;
    }
    // Past the top of the ladder — fall through to the generic scale.
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const fraction = rawStep / magnitude;
  let nice: number;
  if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 2.5) nice = 2.5;
  else if (fraction <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

function buildAxis(lo: number, hi: number, step: number): Axis {
  const count = Math.max(1, Math.round((hi - lo) / step));
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) {
    // toPrecision clears the float noise that 0.1 * 3 leaves behind.
    ticks.push(Number((lo + i * step).toPrecision(12)));
  }
  return { min: ticks[0], max: ticks[ticks.length - 1], step, ticks };
}

/** Sensible Y-axis bounds and gridline values for a data range. */
export function niceAxisBounds(
  dataMin: number,
  dataMax: number,
  options: AxisOptions = {}
): Axis {
  const {
    targetTicks = 5,
    min: forcedMin,
    max: forcedMax,
    zeroBased = false,
    snapZeroWithin = 0.35,
    allowNegative = true,
    stepLadder = null,
    clampMin,
    clampMax,
    preferMax,
  } = options;

  // Fixed scale — the metric has bounds that don't depend on the data.
  if (
    forcedMin !== undefined && isFinite(forcedMin) &&
    forcedMax !== undefined && isFinite(forcedMax) &&
    forcedMax > forcedMin
  ) {
    return buildAxis(forcedMin, forcedMax, niceStep((forcedMax - forcedMin) / targetTicks, stepLadder));
  }

  let lo = isFinite(dataMin) ? dataMin : 0;
  let hi = isFinite(dataMax) ? dataMax : 0;
  if (hi < lo) [lo, hi] = [hi, lo];

  // Flat line — open out a readable band so it isn't drawn on the axis.
  if (hi - lo < 1e-9) {
    const pad = Math.abs(hi) > 1e-9 ? Math.abs(hi) * 0.1 : 1;
    lo -= pad;
    hi += pad;
  }

  const shouldSnapToZero =
    zeroBased || (snapZeroWithin > 0 && lo >= 0 && hi > 0 && lo <= hi * snapZeroWithin);
  if (shouldSnapToZero) lo = 0;

  const step = niceStep((hi - lo) / targetTicks, stepLadder);
  let niceMin = Math.floor(lo / step) * step;
  let niceMax = Math.ceil(hi / step) * step;

  if (!allowNegative && niceMin < 0) niceMin = 0;
  // Close to the natural ceiling — go the last step and land on it.
  if (preferMax !== undefined && isFinite(preferMax) && niceMax < preferMax && preferMax - niceMax <= step) {
    niceMax = preferMax;
  }
  // Never round past a natural limit, and never clip the data either.
  if (clampMin !== undefined && isFinite(clampMin) && niceMin < clampMin) niceMin = Math.min(clampMin, lo);
  if (clampMax !== undefined && isFinite(clampMax) && niceMax > clampMax) niceMax = Math.max(clampMax, hi);
  if (niceMax - niceMin < step) niceMax = niceMin + step;

  return buildAxis(niceMin, niceMax, step);
}

/**
 * Per-metric axis rules, mirroring ChartManager.AXIS_OPTIONS in the standalone.
 *
 * Zero is a real floor for speed, power, cadence and GPS error, and the data
 * reaches it. It is meaningless for heart rate, pace and temperature, so those
 * only get rounded out. Battery is capped at 100 and prefers it as the top.
 */
export const AXIS_OPTIONS: Record<string, AxisOptions> = {
  battery: { stepLadder: BATTERY_STEPS, allowNegative: false, clampMax: 100, preferMax: 100 },
  gpsAccuracy: { zeroBased: true, allowNegative: false },
  speed: { allowNegative: false },
  power: { allowNegative: false },
  cadence: { allowNegative: false },
  elevation: {},
  heartRate: { snapZeroWithin: 0, allowNegative: false },
  pace: { snapZeroWithin: 0, allowNegative: false, stepLadder: PACE_STEPS },
  temperature: { snapZeroWithin: 0 },
};

export function axisOptionsFor(metric: string): AxisOptions {
  return AXIS_OPTIONS[metric] ?? { snapZeroWithin: 0 };
}
