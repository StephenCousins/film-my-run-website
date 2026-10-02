import type { Metadata } from 'next';
import { GAME_NAME, londonDate, puzzleFor } from '@/lib/word-run/game';
import WordRunClient from './WordRunClient';

// The puzzle changes at midnight London time, so never prerender it.
export const dynamic = 'force-dynamic';

const DESCRIPTION = 'Speed play with words: a new running word every day. Four letters early in the week, building to a seven-letter long run on Sunday.';

export const metadata: Metadata = {
  title: `${GAME_NAME}: the daily running word game`,
  description: DESCRIPTION,
  alternates: { canonical: 'https://filmmyrun.com/games/fartlex' },
  openGraph: { title: `${GAME_NAME} | Film My Run`, description: DESCRIPTION, images: ['/games/fartlex/og'] },
  twitter: { card: 'summary_large_image', title: `${GAME_NAME} | Film My Run`, description: DESCRIPTION, images: ['/games/fartlex/og'] },
};

export default function WordRunPage() {
  const p = puzzleFor(londonDate());
  return <WordRunClient puzzle={{ number: p.number, length: p.length, maxGuesses: p.maxGuesses, word: p.answer.word, fact: p.answer.fact, link: p.answer.link ?? null }} />;
}
