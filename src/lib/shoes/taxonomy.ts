import { ShoeCategory, ReviewSource, ShoeTerrain } from '@prisma/client';

export const CATEGORY_LABELS: Record<ShoeCategory, string> = {
  daily_trainer: 'Daily Trainer',
  race: 'Race',
  long_run: 'Long Run',
  speed: 'Speed',
  ultra: 'Ultra',
  stability: 'Stability',
  max_cushion: 'Max Cushion',
  minimal: 'Minimal',
};

export const SOURCE_LABELS: Record<ReviewSource, string> = {
  runrepeat: 'RunRepeat',
  runners_world: "Runner's World",
  irunfar: 'iRunFar',
  believe_in_run: 'Believe in the Run',
  the_run_testers: 'The Run Testers',
  running_shoes_guru: 'Running Shoes Guru',
  road_trail_run: 'Road Trail Run',
  doctors_of_running: 'Doctors of Running',
  other: 'Other',
};

export const TERRAIN_LABELS: Record<ShoeTerrain, string> = { road: 'Road', trail: 'Trail', both: 'Road & Trail' };

export function isShoeCategory(x: unknown): x is ShoeCategory {
  return typeof x === 'string' && x in CATEGORY_LABELS;
}
export function isShoeTerrain(x: unknown): x is ShoeTerrain {
  return typeof x === 'string' && x in TERRAIN_LABELS;
}

/** Review-site domains, in the order results are preferred. */
export const REVIEW_SOURCES: { key: ReviewSource; domain: string }[] = [
  { key: 'runrepeat', domain: 'runrepeat.com' },
  { key: 'runners_world', domain: 'runnersworld.com' },
  { key: 'irunfar', domain: 'irunfar.com' },
  { key: 'believe_in_run', domain: 'believeintherun.com' },
  { key: 'the_run_testers', domain: 'theruntesters.com' },
  { key: 'running_shoes_guru', domain: 'runningshoesguru.com' },
  { key: 'road_trail_run', domain: 'roadtrailrun.com' },
  { key: 'doctors_of_running', domain: 'doctorsofrunning.com' },
];

export function identifySource(url: string): ReviewSource {
  for (const s of REVIEW_SOURCES) if (url.includes(s.domain)) return s.key;
  return 'other';
}
