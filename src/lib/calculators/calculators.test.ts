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
