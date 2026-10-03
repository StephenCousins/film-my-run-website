import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { prisma } from '@/lib/db';
import { currentMember } from '@/lib/members/current';
import { londonDate, puzzleFor } from '@/lib/word-run/game';
import type { Stats } from '@/lib/word-run/stats';
import { checkResult, resultsFrom, statsFrom, type Result } from '@/lib/word-run/sync';

// Fartlex record for a signed-in player, shared by the website (session cookie) and the app (bearer).
// POST { result?: { puzzle, guesses }, stats?: <a device's old record, sent on its first sync> }
//   → { ok, stats, today: { puzzle, guesses } | null }. 401 when signed out: the device keeps its own record.
export const dynamic = 'force-dynamic';

const isStats = (s: unknown): s is Stats => {
  const o = s as Stats;
  return !!o && typeof o === 'object' && Number.isInteger(o.streak) && o.streak >= 0 && o.streak <= 400
    && (o.lastWon == null || Number.isInteger(o.lastWon)) && (o.lastPlayed == null || Number.isInteger(o.lastPlayed));
};

export const POST = withAppApi(
  async (req) => {
    const { member } = await currentMember(req);
    if (!member) return NextResponse.json({ ok: false, error: 'signed_out' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const today = puzzleFor(londonDate()).number;

    const incoming: Result[] = [];
    if (body.result) {
      const r = checkResult(body.result.puzzle, body.result.guesses, today);
      if (!r) return NextResponse.json({ ok: false, error: 'bad_result' }, { status: 400 });
      incoming.push(r);
    }
    // The app leaves out empty fields where the website sends null.
    if (isStats(body.stats)) incoming.push(...resultsFrom({ ...body.stats, lastWon: body.stats.lastWon ?? null, lastPlayed: body.stats.lastPlayed ?? null }).filter((r) => r.puzzle <= today));
    if (incoming.length) {
      // The first result for a puzzle wins: a game played on two devices counts once.
      await prisma.fartlex_results.createMany({
        data: incoming.map((r) => ({ user_id: member.id, puzzle: r.puzzle, won: r.won, guesses: r.guesses })),
        skipDuplicates: true,
      });
      // A real game fills in a carried-over row for the same puzzle, so other devices can show its grid.
      const real = incoming[0]?.guesses.length ? incoming[0] : null;
      if (real) {
        await prisma.fartlex_results.updateMany({
          where: { user_id: member.id, puzzle: real.puzzle, guesses: { isEmpty: true } },
          data: { won: real.won, guesses: real.guesses },
        });
      }
    }

    const rows = await prisma.fartlex_results.findMany({ where: { user_id: member.id }, select: { puzzle: true, won: true, guesses: true } });
    const todays = rows.find((r) => r.puzzle === today && r.guesses.length > 0);
    return NextResponse.json({ ok: true, stats: statsFrom(rows), today: todays ? { puzzle: today, guesses: todays.guesses } : null });
  },
  { limit: 60 }
);
