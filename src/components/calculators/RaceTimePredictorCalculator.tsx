'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  ADVANCED_DISTANCES,
  PREDICTOR_RACES,
  PREDICTOR_TABLES,
  advancedInputFromForm,
  advancedInputIsComplete,
  advancedRaceOrderIsValid,
  formatTimeFromSeconds,
  predictAdvanced,
  predictQuick,
  quickInputFromForm,
  raceById,
  standardDistances,
  type AdvancedPrediction,
  type RacePrediction,
} from '@/lib/calculators';
import { PREDICTOR_EVIDENCE } from '@/lib/calculators/predictorEvidence';

const MARATHON_KM = 42.195;
const TERRAINS = [
  { value: 'hilly', label: 'Hilly trail (about 24 m of climb per km)' },
  { value: 'flat', label: 'Flat trail or towpath (about 4 m per km)' },
  { value: 'rolling', label: 'Rolling trail (about 13 m per km)' },
  { value: 'mountain', label: 'Mountain (about 47 m per km)' },
  { value: 'road', label: 'Road' },
];
const CLASS_LABEL: Record<string, string> = { flat: 'Flat', rolling: 'Rolling', hilly: 'Hilly', mountain: 'Mountain' };
const WARNING_TEXT: Record<string, string> = {
  softAnchor: 'That known time is slower than most people race the distance flat out, so it says less about you than a longer race would. If you have one, use it.',
  staleAnchor: 'That race is more than two years old. Runners with an old PB as their anchor come in about 5% slower than the prediction.',
  outsideBands: 'That time is outside the range we have data for, so the nearest measured runners were used.',
  nonStandardDistance: 'One of the distances is not a standard one, so we interpolated between the nearest standard distances.',
};

const select = 'w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-orange-500';
const label = 'block text-sm font-medium text-zinc-300 mb-2';

function TimeFields({ value, onChange, small }: { value: { hours: string; minutes: string; seconds: string }; onChange: (v: { hours: string; minutes: string; seconds: string }) => void; small?: boolean }) {
  const cls = small
    ? 'w-12 px-2 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm text-center focus:outline-none focus:border-orange-500'
    : 'w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center focus:outline-none focus:border-orange-500';
  return (
    <div className={small ? 'flex gap-1' : 'flex gap-2'}>
      {(['hours', 'minutes', 'seconds'] as const).map((part, i) => (
        <div key={part} className={small ? 'flex items-center gap-1' : 'flex-1 flex items-start gap-2'}>
          {i > 0 && <span className={small ? 'text-zinc-400' : 'text-2xl text-zinc-400 mt-3'}>:</span>}
          <div className={small ? '' : 'flex-1'}>
            <input
              type="number"
              value={value[part]}
              onChange={(e) => onChange({ ...value, [part]: e.target.value })}
              className={cls}
              min="0"
              max={part === 'hours' ? undefined : '59'}
              placeholder={part[0].toUpperCase()}
              aria-label={part}
            />
            {!small && <span className="text-xs text-zinc-500 block text-center mt-1">{part === 'hours' ? 'hours' : part === 'minutes' ? 'min' : 'sec'}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function UltraTargetFields({ terrain, setTerrain, raceId, setRaceId, climb, setClimb, targetKm }: { terrain: string; setTerrain: (v: string) => void; raceId: string; setRaceId: (v: string) => void; climb: string; setClimb: (v: string) => void; targetKm: number | null }) {
  const races = PREDICTOR_RACES.filter((r) => targetKm === null || Math.abs(Math.log(r.km / targetKm)) < 0.35).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="p-4 bg-zinc-800 rounded-xl space-y-4">
      <div>
        <label className={label}>Which race, if we have it</label>
        <select value={raceId} onChange={(e) => setRaceId(e.target.value)} className={select.replace('bg-zinc-800', 'bg-zinc-900')}>
          <option value="">Not in the list, use the terrain below</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.km.toFixed(0)} km, {CLASS_LABEL[r.class]}, {r.n.toLocaleString('en-GB')} finishes)
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 mt-1">{PREDICTOR_RACES.length} UK ultras have a cost measured from their own finishers. That beats any climb figure.</p>
      </div>
      {!raceId && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Terrain</label>
            <select value={terrain} onChange={(e) => setTerrain(e.target.value)} className={select.replace('bg-zinc-800', 'bg-zinc-900')}>
              {TERRAINS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Or the climb, metres per km</label>
            <input type="number" value={climb} onChange={(e) => setClimb(e.target.value)} placeholder="e.g. 38 for 3,000 m over 80 km" className={select.replace('bg-zinc-800', 'bg-zinc-900')} min="0" />
          </div>
        </div>
      )}
    </div>
  );
}

function Result({ result, cross }: { result: RacePrediction | AdvancedPrediction; cross?: { label: string; seconds: number | null } }) {
  const race = result.method === 'race' ? PREDICTOR_RACES.find((r) => r.name === result.distance) : null;
  const how =
    result.method === 'same' ? 'Your own time.'
    : result.method === 'race' ? `Cost measured from ${race?.n.toLocaleString('en-GB') ?? 'its'} finishes of this race.`
    : result.method === 'climb' ? 'Cost from the distance and the climb you gave.'
    : result.method === 'terrain' ? 'Cost from the distance and the terrain class.'
    : `Exponent ${result.factor.toFixed(3)} for runners with your time.`;
  return (
    <div className={`p-4 rounded-xl border ${result.isUltra ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30' : 'bg-zinc-800 border-zinc-700'}`}>
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="font-semibold text-white">
            {result.distance}
            {result.isUltra && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">Ultra</span>}
          </div>
          <div className="text-sm text-zinc-500">{result.km.toFixed(1)} km</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-mono font-bold text-orange-500">{result.time}</div>
          {result.method !== 'same' && (
            <div className="text-xs text-zinc-400 font-mono">{formatTimeFromSeconds(result.lowSeconds)} to {formatTimeFromSeconds(result.highSeconds)}</div>
          )}
          <div className="text-sm text-zinc-500">{result.pace}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        {how}
        {cross && cross.seconds !== null && ` From your ${cross.label} alone: ${formatTimeFromSeconds(cross.seconds)}.`}
      </div>
      {result.method !== 'same' && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Measured accuracy of this method</span>
            <span>{result.confidence}%</span>
          </div>
          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${result.confidence}%` }} />
          </div>
        </div>
      )}
      {result.warnings.map((w) => (
        <p key={w} className="mt-2 text-xs text-amber-400">{WARNING_TEXT[w]}</p>
      ))}
    </div>
  );
}

export function RaceTimePredictorCalculator() {
  const { requireAuth, LoginModal } = useRequireAuth({ feature: 'running calculators' });
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick');

  // Quick mode inputs
  const [knownDistance, setKnownDistance] = useState('10');
  const [knownTime, setKnownTime] = useState({ hours: '0', minutes: '50', seconds: '0' });
  const [targetDistance, setTargetDistance] = useState('42.195');
  // "25" faster quarter, "50" typical, "75" slower quarter (was the 1.04–1.10 experience factor)
  const [experience, setExperience] = useState('50');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [terrain, setTerrain] = useState('hilly');
  const [raceId, setRaceId] = useState('');
  const [climb, setClimb] = useState('');

  // Advanced mode inputs
  const [race1Distance, setRace1Distance] = useState('10');
  const [race1Time, setRace1Time] = useState({ hours: '0', minutes: '50', seconds: '0' });
  const [race2Distance, setRace2Distance] = useState('21.0975');
  const [race2Time, setRace2Time] = useState({ hours: '1', minutes: '50', seconds: '0' });

  const [results, setResults] = useState<(RacePrediction | AdvancedPrediction)[]>([]);
  const [showHow, setShowHow] = useState(false);

  const targetKm = parseFloat(targetDistance);
  const targetIsUltra = targetKm > MARATHON_KM;
  const ultraForm = raceId
    ? { targetRaceId: raceId }
    : terrain === 'road'
      ? { targetSurface: 'road', targetTerrain: 'flat', targetClimbPerKm: climb }
      : { targetSurface: 'trail', targetTerrain: terrain, targetClimbPerKm: climb };

  const calculateQuick = () => {
    // Maths lives in src/lib/calculators/racePredictor.ts (shared with the iPhone app).
    const predictions = predictQuick(quickInputFromForm({ knownDistance, knownTime, targetDistance, experience, gender, ...(targetIsUltra ? ultraForm : {}) }));
    if (!predictions) return;
    setResults(predictions);
  };

  const calculateAdvanced = () => {
    const input = advancedInputFromForm({ race1Distance, race1Time, race2Distance, race2Time, gender, experience, ...(terrain === 'road' ? { targetSurface: 'road', targetTerrain: 'flat' } : { targetSurface: 'trail', targetTerrain: terrain }) });
    if (!advancedInputIsComplete(input)) return;
    if (!advancedRaceOrderIsValid(input)) {
      alert('Race #1 should be shorter than Race #2');
      return;
    }
    const predictions = predictAdvanced(input);
    if (!predictions) return;
    setResults(predictions);
  };

  const raceLabel = (km: string) => standardDistances.find((d) => String(d.km) === km)?.label ?? `${km} km`;
  const ev = PREDICTOR_EVIDENCE;

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 lg:p-8">
      <h3 className="font-display text-xl font-bold text-white mb-4">Race Time Predictor</h3>

      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          Built on {ev.roadPerformancesText} UK race results and {ev.ultraFinishesText} ultra finishes, not a formula from 1980. Every prediction comes with the range the middle half of runners with your time actually finished in.{' '}
          <button type="button" onClick={() => setShowHow((s) => !s)} className="underline underline-offset-2">
            {showHow ? 'Hide how it works' : 'How it works'}
          </button>
        </p>
      </div>

      {showHow && (
        <div className="mb-6 p-4 bg-zinc-800 rounded-xl text-sm text-zinc-300 space-y-3">
          <p>
            Most calculators use Riegel&apos;s 1980 rule: double the distance and you take 2.08 times as long. We checked it against every UK road result on Power of 10 from 2021 to 2025, {ev.roadPerformancesText} performances by {ev.roadAthletesText} runners with a time at more than one distance. It only fits the fastest few per cent. A 1:45 half-marathon runner does not run a 3:44 marathon. The men run about 4:04 and the women about 3:46, and the middle half of them finish inside a 30-minute window. So this tool looks up runners with your time, at your distance, going to your target distance, and tells you what they did.
          </p>
          <p>
            Beyond the marathon we did something different. We took every UK ultra on the DUV database from 2015 to 2026, {ev.ultraFinishesText} finishes by {ev.ultraRunnersText} runners across {ev.ultraEditionsText} race editions, and worked out two things at once: how good each runner is, and how hard each race is. {ev.racesText} races now have a measured cost. Lakeland 50 is 44% slower than a flat 50-miler for the same runner. Ultra Trail Snowdonia 100K is more than double a flat 100K. Where we have not measured a race, the distance and the climb explain 97% of the difference between the ones we have.
          </p>
          <p>
            Then we tested it. For {ev.marathonUltraPairsText} ultra finishes by runners who also ran a marathon that year, the old formula was {ev.oldModelErrorUltraPct}% out at the median, and {ev.oldModelErrorMountainPct}% on mountain races. This model, tested on years it had not seen, is {ev.heldOutErrorUltraPct}% out, {ev.heldOutErrorUltraMountainPct}% in the mountains. That is about the same as one runner varies from race to race, which is as good as a prediction from a single known race can be. On the road, from your half to your marathon, it is {ev.marathonFromHalfErrorPct}% against Riegel&apos;s {ev.riegelMarathonFromHalfErrorPct}%.
          </p>
          <p>
            Two things we tried and threw out, because the data said no. A personal exponent from two of your races (the old Advanced mode) predicts your marathon worse than Riegel does, so two races are now two anchors and the tool uses whichever is nearer your target. And age: once we know your time, your age adds nothing to the prediction, so we do not ask.
          </p>
        </div>
      )}

      {/* Mode selector */}
      <div className="flex gap-2 p-1 bg-zinc-800 rounded-xl mb-6">
        {(['quick', 'advanced'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setResults([]);
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${mode === m ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            {m === 'quick' ? 'One race' : 'Two races'}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <label className={label}>Sex</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')} className={select}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <p className="text-xs text-zinc-500 mt-1">Women hold their pace better from the half to the marathon. It makes no difference below that.</p>
        </div>

        {mode === 'quick' ? (
          <>
            <div>
              <label className={label}>A race you have run</label>
              <select value={knownDistance} onChange={(e) => setKnownDistance(e.target.value)} className={select}>
                {standardDistances.slice(0, 4).map((d) => (
                  <option key={d.km} value={d.km}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Your time</label>
              <TimeFields value={knownTime} onChange={setKnownTime} />
            </div>
            <div>
              <label className={label}>The race you want to predict</label>
              <select value={targetDistance} onChange={(e) => { setTargetDistance(e.target.value); setRaceId(''); }} className={select}>
                {standardDistances.map((d) => (
                  <option key={d.km} value={d.km}>{d.label}</option>
                ))}
              </select>
            </div>
            {targetIsUltra && <UltraTargetFields terrain={terrain} setTerrain={setTerrain} raceId={raceId} setRaceId={setRaceId} climb={climb} setClimb={setClimb} targetKm={targetKm} />}
            <div>
              <label className={label}>Among runners with your time, where do you sit?</label>
              <select value={experience} onChange={(e) => setExperience(e.target.value)} className={select}>
                <option value="50">Typical (the middle of the field)</option>
                <option value="25">Faster quarter (high mileage, well trained for the distance)</option>
                <option value="75">Slower quarter (light training, or a first go at the distance)</option>
              </select>
              <p className="text-xs text-zinc-500 mt-1">The spread is measured; where you sit in it is your call. The range shown is the same whichever you pick.</p>
            </div>
            <button onClick={() => requireAuth(calculateQuick)} className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors">
              Predict my time
            </button>
          </>
        ) : (
          <>
            {[
              { title: 'Race #1 (the shorter one)', dist: race1Distance, setDist: setRace1Distance, time: race1Time, setTime: setRace1Time, opts: standardDistances.slice(0, 4) },
              { title: 'Race #2 (the longer one)', dist: race2Distance, setDist: setRace2Distance, time: race2Time, setTime: setRace2Time, opts: standardDistances },
            ].map((r) => (
              <div key={r.title} className="p-4 bg-zinc-800 rounded-xl">
                <h4 className="font-medium text-white mb-3">{r.title}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Distance</label>
                    <select value={r.dist} onChange={(e) => r.setDist(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500">
                      {r.opts.map((d) => (
                        <option key={d.km} value={d.km}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Time</label>
                    <TimeFields value={r.time} onChange={r.setTime} small />
                  </div>
                </div>
              </div>
            ))}
            <div>
              <label className={label}>Terrain for the ultra distances</label>
              <select value={terrain} onChange={(e) => setTerrain(e.target.value)} className={select}>
                {TERRAINS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Among runners with your times, where do you sit?</label>
              <select value={experience} onChange={(e) => setExperience(e.target.value)} className={select}>
                <option value="50">Typical (the middle of the field)</option>
                <option value="25">Faster quarter</option>
                <option value="75">Slower quarter</option>
              </select>
            </div>
            <p className="text-xs text-zinc-500">Each distance is predicted from whichever of your two races is nearer to it, and the other race is shown as a cross-check. No age, weight or height: once we have your times, they add nothing.</p>
            <button onClick={() => requireAuth(calculateAdvanced)} className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors">
              Predict every distance
            </button>
          </>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Predicted times</h4>
            <div className="grid gap-3">
              {results.map((result) => {
                const adv = 'anchor' in result ? (result as AdvancedPrediction) : null;
                return (
                  <Result
                    key={result.distance}
                    result={result}
                    cross={adv ? { label: raceLabel(adv.anchor === 1 ? race2Distance : race1Distance), seconds: adv.crossCheckSeconds } : undefined}
                  />
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">
              {mode === 'quick' && targetIsUltra && raceId ? `${raceById(raceId)?.name}: cost measured from ${raceById(raceId)?.n.toLocaleString('en-GB')} finishes across ${raceById(raceId)?.editions} editions. ` : ''}
              The range is where the middle half of runners with your time finished. Source: Power of 10 road rankings 2021 to 2025 and DUV ultra results 2015 to 2026, analysed by Film My Run, September 2026. {ADVANCED_DISTANCES.length} standard distances; {PREDICTOR_TABLES.races.length} measured races.
            </p>
          </div>
        )}
      </div>
      {LoginModal}
    </div>
  );
}
