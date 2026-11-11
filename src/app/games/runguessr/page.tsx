import fs from 'node:fs/promises';
import path from 'node:path';
import type { Metadata } from 'next';
import { GAME_NAME, londonDate, pickRounds, puzzleNumber, seedFor, type RaceData } from '@/lib/runguessr/game';
import RunGuessrClient from './RunGuessrClient';

// Today's five change at midnight London time, so never prerender.
export const dynamic = 'force-dynamic';

const DESCRIPTION = 'Guess the race from a photo, an elevation profile or a course map. Five races a day, from Western States to the Great North Run.';

export const metadata: Metadata = {
  title: `${GAME_NAME}: the daily race guessing game`,
  description: DESCRIPTION,
  alternates: { canonical: 'https://filmmyrun.com/games/runguessr' },
  openGraph: { title: `${GAME_NAME} | Film My Run`, description: DESCRIPTION, images: ['/games/runguessr/og'] },
  twitter: { card: 'summary_large_image', title: `${GAME_NAME} | Film My Run`, description: DESCRIPTION, images: ['/games/runguessr/og'] },
};

let cached: Promise<RaceData> | null = null;
const loadData = () => (cached ??= fs.readFile(path.join(process.cwd(), 'public/games/runguessr/races.json'), 'utf8').then((t) => JSON.parse(t) as RaceData));

export default async function RunGuessrPage() {
  const data = await loadData();
  const date = londonDate();
  return <RunGuessrClient number={puzzleNumber(date)} rounds={pickRounds(data, seedFor(date))} raceCount={data.courses.length} />;
}
