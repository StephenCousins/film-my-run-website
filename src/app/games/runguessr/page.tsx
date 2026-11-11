import type { Metadata } from 'next';
import { loadRaceData, roundsFor } from '@/lib/runguessr/data';
import { GAME_NAME, londonDate, puzzleNumber } from '@/lib/runguessr/game';
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

export default async function RunGuessrPage() {
  const number = puzzleNumber(londonDate());
  const [data, rounds] = await Promise.all([loadRaceData(), roundsFor(number)]);
  return <RunGuessrClient number={number} rounds={rounds} raceCount={data.courses.length} />;
}
