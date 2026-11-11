import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { prisma } from '@/lib/db';
import { currentMember } from '@/lib/members/current';
import { roundsFor } from '@/lib/runguessr/data';
import { londonDate, puzzleNumber } from '@/lib/runguessr/game';
import { checkResult, packClues, statsFrom, unpackClues } from '@/lib/runguessr/sync';

// RunGuessr record for a signed-in player (11 Nov 2026), shared by the website (session cookie) and the app (bearer).
// POST { result?: { puzzle, answers: [5 race ids], clues: [5 × "km,gain" or ["km","gain"]] } }
//   → { ok, stats, today: { puzzle, answers, clues } | null }. 401 when signed out: the device keeps its own record.
// The first finished game for a puzzle wins, so a day played on two devices counts once.
export const dynamic = 'force-dynamic';

export const POST = withAppApi(
  async (req) => {
    const { member } = await currentMember(req);
    if (!member) return NextResponse.json({ ok: false, error: 'signed_out' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const today = puzzleNumber(londonDate());

    if (body.result) {
      const p = body.result.puzzle;
      const r = Number.isInteger(p) && p >= 1 && p <= today ? checkResult(p, body.result.answers, body.result.clues, today, await roundsFor(p)) : null;
      if (!r) return NextResponse.json({ ok: false, error: 'bad_result' }, { status: 400 });
      await prisma.runguessr_results.createMany({
        data: [{ user_id: member.id, puzzle: r.puzzle, answers: r.answers, clues: packClues(r.clues), score: r.score }],
        skipDuplicates: true,
      });
    }

    const rows = await prisma.runguessr_results.findMany({ where: { user_id: member.id }, select: { puzzle: true, score: true, answers: true, clues: true } });
    const todays = rows.find((r) => r.puzzle === today);
    return NextResponse.json({
      ok: true,
      stats: statsFrom(rows),
      today: todays ? { puzzle: today, answers: todays.answers, clues: unpackClues(todays.clues) } : null,
    });
  },
  { limit: 60 }
);
