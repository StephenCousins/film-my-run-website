import { describe, expect, it } from 'vitest';
import golden from './golden.json';
import {
  adjustForElevation,
  advancedInputFromForm,
  advancedInputIsComplete,
  advancedRaceOrderIsValid,
  calculateHRZones,
  calculatePace,
  calculatePaceZones,
  elevationInputFromForm,
  estimateVO2Max,
  gradeAge,
  hrZonesInputFromForm,
  nutritionInputFromForm,
  paceInputFromForm,
  paceZonesInputFromForm,
  planNutrition,
  predictAdvanced,
  predictQuick,
  quickInputFromForm,
  vo2MaxInputFromForm,
} from './index';

/**
 * golden.json holds outputs captured from the calculator components as they
 * were BEFORE the maths moved here (commit d573d47, 11 Sep 2026). Every case
 * must still produce the same result. If a formula is ever changed on purpose,
 * regenerate the file and say so in the commit.
 *
 * Changed on purpose: 12 Sep 2026, quick-mode ultra predictions (the five
 * `quick` cases with targets beyond the marathon) after the exponent was
 * recalibrated to real 100-mile finishing times; see racePredictor.ts.
 *
 * Changed on purpose: 17 Sep 2026, every `quick` and `advanced` case, when the
 * predictor moved to the evidence model (band exponents by distance pair and
 * known time, ability × race cost beyond the marathon; two races are two
 * anchors, no age/BMI terms). Regenerated with scripts/regen-predictor-golden.ts.
 *
 * Changed on purpose: 25 Oct 2026, two `pace` cases (rounding-59.6s, 100mi-30h)
 * that had captured the 3:60 bug: pace is now rounded to whole seconds before
 * splitting into minutes and seconds (UI sweep T1).
 */

type Case<I, O> = { id: string; input: I; output: O };

// golden.json is loosely typed (optional fields differ per case); the runners
// below only ever pass a case's input to the matching form parser.
const cases = golden as unknown as Record<string, Case<never, unknown>[]>;

function each<I, O>(cases: Case<I, O>[], run: (input: I) => unknown) {
  for (const c of cases) {
    it(c.id, () => {
      const actual = run(c.input);
      if (c.output === null) {
        expect(actual).toBeNull();
      } else {
        expect(actual).toMatchObject(c.output as object);
      }
    });
  }
}

describe('pace', () => {
  each(cases.pace as Case<Parameters<typeof paceInputFromForm>[0], unknown>[], (f) =>
    calculatePace(paceInputFromForm(f))
  );
});

describe('race predictor, quick', () => {
  each(cases.quick as Case<Parameters<typeof quickInputFromForm>[0], unknown>[], (f) =>
    predictQuick(quickInputFromForm(f))
  );
});

describe('race predictor, advanced', () => {
  for (const c of cases.advanced as Case<Parameters<typeof advancedInputFromForm>[0], unknown>[]) {
    it(c.id, () => {
      const input = advancedInputFromForm(c.input);
      if (c.output === 'ALERT') {
        // The component alerts "Race #1 should be shorter than Race #2".
        expect(advancedInputIsComplete(input)).toBe(true);
        expect(advancedRaceOrderIsValid(input)).toBe(false);
        expect(predictAdvanced(input)).toBeNull();
      } else if (c.output === null) {
        expect(advancedInputIsComplete(input)).toBe(false);
        expect(predictAdvanced(input)).toBeNull();
      } else {
        expect(predictAdvanced(input)).toMatchObject(c.output as object);
      }
    });
  }
});

describe('age grading', () => {
  each(cases.ageGrading as Case<Parameters<typeof gradeAge>[0], unknown>[], (i) => gradeAge(i));
});

describe('vo2 max', () => {
  each(cases.vo2 as Case<Parameters<typeof vo2MaxInputFromForm>[0], unknown>[], (f) =>
    estimateVO2Max(vo2MaxInputFromForm(f))
  );
});

describe('training zones, heart rate', () => {
  each(cases.hrZones as Case<Parameters<typeof hrZonesInputFromForm>[0], unknown>[], (f) =>
    calculateHRZones(hrZonesInputFromForm(f))
  );
});

describe('training zones, pace', () => {
  each(cases.paceZones as Case<Parameters<typeof paceZonesInputFromForm>[0], unknown>[], (f) =>
    calculatePaceZones(paceZonesInputFromForm(f))
  );
});

describe('elevation', () => {
  each(cases.elevation as Case<Parameters<typeof elevationInputFromForm>[0], unknown>[], (f) =>
    adjustForElevation(elevationInputFromForm(f))
  );
});

describe('nutrition', () => {
  each(cases.nutrition as Case<Parameters<typeof nutritionInputFromForm>[0], unknown>[], (f) =>
    planNutrition(nutritionInputFromForm(f))
  );
});

describe('pace rounding (UI sweep T1)', () => {
  it('rounds the whole pace before splitting, so 239.6 s/km is 4:00, not 3:60', () => {
    const r = calculatePace({ distanceKm: 10, totalSeconds: 2396 });
    expect(r?.pace).toBe('4:00 /km');
    expect(r?.speed).toContain('(6:26 /mile)');
  });

  it('training pace zones never show :60', () => {
    const zones = calculatePaceZones({ thresholdMinutes: 3, thresholdSecondsPerKm: 239.6 });
    expect(zones?.find((z) => z.name.startsWith('Zone 4'))?.pace).toBe('4:00/km');
    for (const z of zones ?? []) expect(z.pace).not.toContain(':60');
  });
});
