import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { loadRaceData, roundsFor } from '@/lib/runguessr/data';
import { londonDate, pickRounds, puzzleNumber } from '@/lib/runguessr/game';

// RunGuessr for the app (11 Nov 2026): today's five by the London date, the same five the website plays.
// ?practice=1 gives a random five instead (number null), which never counts towards a record.
export const dynamic = 'force-dynamic';
export const GET = withAppApi(
  async (req) => {
    const practice = new URL(req.url).searchParams.get('practice') === '1';
    if (practice) {
      const data = await loadRaceData();
      return NextResponse.json({ ok: true, number: null, date: null, raceCount: data.courses.length, rounds: pickRounds(data, Math.floor(Math.random() * 2 ** 31)) });
    }
    const date = londonDate();
    const number = puzzleNumber(date);
    const data = await loadRaceData();
    return NextResponse.json({ ok: true, number, date, raceCount: data.courses.length, rounds: await roundsFor(number) });
  },
  { limit: 60 }
);
