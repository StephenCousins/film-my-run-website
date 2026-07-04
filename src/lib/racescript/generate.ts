import Anthropic from '@anthropic-ai/sdk';
import { HOUSE_STYLE, FORMAT_SPECS, FORMAT_LABELS, type OutputFormat } from './voice';
import type { ActivityData } from './strava';
import type { RaceWeather } from './weather';

export interface QA {
  question: string;
  answer: string;
}

function fmtDuration(sec: number): string {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0
    ? `${h}h ${m}m ${s}s`
    : `${m}m ${s}s`;
}

function fmtPace(distanceKm: number, movingSec: number): string {
  if (!distanceKm || !movingSec) return '—';
  const secPerKm = movingSec / distanceKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')} /km`;
}

export function buildActivityContext(a: ActivityData, weather: RaceWeather | null): string {
  const lines: string[] = [];
  lines.push(`Runner: ${a.athleteName || 'the runner'}`);
  lines.push(`Activity title: ${a.name}`);
  lines.push(`Type: ${a.sportType}`);
  lines.push(`Date: ${a.startLocalIso.slice(0, 10)}`);
  lines.push(`Distance: ${a.distanceKm.toFixed(2)} km`);
  lines.push(`Moving time: ${fmtDuration(a.movingTimeSec)} (elapsed ${fmtDuration(a.elapsedTimeSec)})`);
  lines.push(`Average pace: ${fmtPace(a.distanceKm, a.movingTimeSec)}`);
  lines.push(`Elevation gain: ${Math.round(a.elevationGainM)} m`);
  if (a.avgHr) lines.push(`Heart rate: avg ${Math.round(a.avgHr)}${a.maxHr ? `, max ${Math.round(a.maxHr)}` : ''} bpm`);
  if (a.avgCadence) lines.push(`Cadence: ${Math.round(a.avgCadence)} spm`);
  if (a.avgWatts) lines.push(`Power: ${Math.round(a.avgWatts)} W avg`);
  if (a.calories) lines.push(`Calories: ${Math.round(a.calories)}`);
  if (a.sufferScore) lines.push(`Relative effort: ${a.sufferScore}`);
  if (a.achievementCount || a.prCount) lines.push(`Achievements: ${a.achievementCount}, personal records: ${a.prCount}`);
  if (a.gearName) lines.push(`Shoes: ${a.gearName}`);
  if (a.bestEfforts.length) {
    const efforts = a.bestEfforts.map((b) => `${b.name} ${fmtDuration(b.timeSec)}`).join(', ');
    lines.push(`Best efforts: ${efforts}`);
  }
  if (a.photoUrls.length) lines.push(`Photos attached: ${a.photoUrls.length}`);
  if (weather) {
    const w: string[] = [weather.description];
    if (weather.tempC != null) w.push(`${Math.round(weather.tempC)}°C`);
    if (weather.feelsLikeC != null) w.push(`feels like ${Math.round(weather.feelsLikeC)}°C`);
    if (weather.windKph != null) w.push(`wind ${Math.round(weather.windKph)} km/h`);
    if (weather.precipMm != null && weather.precipMm > 0) w.push(`${weather.precipMm} mm rain`);
    if (weather.humidity != null) w.push(`${Math.round(weather.humidity)}% humidity`);
    lines.push(`Weather at the start: ${w.join(', ')}`);
  }
  if (a.description) {
    lines.push(`\nThe runner's own notes on Strava (use as raw material, rewrite in their voice — do not quote verbatim):\n"""${a.description}"""`);
  }
  return lines.join('\n');
}

export async function generateRaceScript(opts: {
  activity: ActivityData;
  weather: RaceWeather | null;
  answers: QA[];
  format: OutputFormat;
}): Promise<string> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  const system = [
    HOUSE_STYLE,
    FORMAT_SPECS[opts.format],
    `Output ONLY the finished ${FORMAT_LABELS[opts.format]} — no preamble, no title label, no notes about your choices, and no reasoning.`,
  ].join('\n\n');

  const answered = opts.answers.filter((qa) => qa.answer.trim());
  const answersBlock = answered.length
    ? answered.map((qa) => `Q: ${qa.question}\nA: ${qa.answer.trim()}`).join('\n\n')
    : '(The runner did not add extra detail — work from the activity data.)';

  const userPrompt = [
    `Write a ${FORMAT_LABELS[opts.format]} about this run.`,
    `=== ACTIVITY DATA (facts — do not invent beyond this) ===\n${buildActivityContext(opts.activity, opts.weather)}`,
    `=== THE RUNNER'S ANSWERS (the human layer — weave these in) ===\n${answersBlock}`,
  ].join('\n\n');

  const res = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
}
