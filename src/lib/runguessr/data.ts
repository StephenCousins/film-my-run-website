// Server only: reads from disk.
import fs from 'node:fs/promises';
import path from 'node:path';
import { dateFor, pickRounds, seedFor, type RaceData, type Round } from './game';

/** The race data (public/games/runguessr/races.json), read once per server process. */
let cached: Promise<RaceData> | null = null;
export const loadRaceData = () =>
  (cached ??= fs.readFile(path.join(process.cwd(), 'public/games/runguessr/races.json'), 'utf8').then((t) => JSON.parse(t) as RaceData));

/** A day's five, the same for the website, the app and the record endpoint's checks. */
export async function roundsFor(puzzle: number): Promise<Round[]> {
  return pickRounds(await loadRaceData(), seedFor(dateFor(puzzle)));
}
