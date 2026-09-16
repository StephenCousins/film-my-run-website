// Regenerates ONLY the race-predictor cases in src/lib/calculators/golden.json
// after a deliberate change to racePredictor.ts. Run: npx tsx scripts/regen-predictor-golden.ts
import { readFileSync, writeFileSync } from 'node:fs';
import * as calc from '../src/lib/calculators/index';
const path = 'src/lib/calculators/golden.json';
const g = JSON.parse(readFileSync(path, 'utf8'));
for (const c of g.quick) c.output = calc.predictQuick(calc.quickInputFromForm(c.input));
for (const c of g.advanced) {
  const input = calc.advancedInputFromForm(c.input);
  c.output = !calc.advancedInputIsComplete(input) ? null : !calc.advancedRaceOrderIsValid(input) ? { error: 'raceOrder' } : calc.predictAdvanced(input);
}
writeFileSync(path, JSON.stringify(g, null, 2) + '\n');
console.log('regenerated', g.quick.length, 'quick and', g.advanced.length, 'advanced cases');
