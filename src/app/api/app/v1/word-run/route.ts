import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { londonDate, puzzleFor } from '@/lib/word-run/game';

// Word Run for the app: today's puzzle by the London date, the same one the website plays.
// Only today's: the answer list itself never leaves the server.
export const dynamic = 'force-dynamic';
export const GET = withAppApi(
  async () => {
    const p = puzzleFor(londonDate());
    return NextResponse.json({
      ok: true,
      puzzle: { number: p.number, date: p.date, length: p.length, maxGuesses: p.maxGuesses, word: p.answer.word, fact: p.answer.fact, link: p.answer.link ? { label: p.answer.link.label, url: `https://filmmyrun.com${p.answer.link.href}` } : null },
    });
  },
  { limit: 60, cacheControl: 'public, max-age=60' }
);
