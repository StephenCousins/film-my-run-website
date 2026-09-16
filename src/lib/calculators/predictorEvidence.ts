import tables from './predictorTables.json';

/**
 * The numbers the site quotes about the Race Predictor, read from the same
 * tables file the predictor runs on, so copy and model can never disagree.
 * Every figure traces to filmmyrun-ios/tools/ultra-calibration/REPORT.md.
 */
const e = tables.evidence;
const gb = (n: number) => n.toLocaleString('en-GB');
const millions = (n: number) => `${(n / 1_000_000).toFixed(2).replace(/0$/, '')} million`;

export const PREDICTOR_EVIDENCE = {
  ...e,
  roadPerformancesText: millions(e.roadPerformances),
  roadAthletesText: gb(e.roadAthletes),
  ultraFinishesText: gb(e.ultraFinishes),
  ultraRunnersText: gb(e.ultraRunners),
  ultraEditionsText: gb(e.ultraEditions),
  marathonUltraPairsText: gb(e.marathonUltraPairs),
  racesText: gb(tables.races.length),
  /** One line for anywhere the tool is mentioned. */
  strapline: `Built on ${millions(e.roadPerformances)} UK race results and ${gb(e.ultraFinishes)} ultra finishes.`,
  /** One sentence with the headline accuracy claim. */
  accuracyClaim: `Tested on ${gb(e.marathonUltraPairs)} real ultra finishes it was ${e.heldOutErrorUltraPct}% out at the median where the standard formula was ${e.oldModelErrorUltraPct}%.`,
};
