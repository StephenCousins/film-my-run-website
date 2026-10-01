import { NextRequest, NextResponse } from 'next/server';
import { getEphemeral } from '@/lib/racescript/store';
import { generateRaceScript, type QA } from '@/lib/racescript/generate';
import type { OutputFormat } from '@/lib/racescript/voice';
import type { ActivityData } from '@/lib/racescript/strava';
import type { RaceWeather } from '@/lib/racescript/weather';

const FORMATS: OutputFormat[] = ['race-report', 'blog', 'instagram', 'facebook'];

// Each call is a paid LLM call, and one Strava connect used to buy unlimited ones.
// ponytail: in-memory like the session store itself; resets on deploy.
const MAX_PER_SESSION = 10;
const used = new Map<string, number>();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const session = typeof body.session === 'string' ? body.session : '';
  const format = body.format as OutputFormat;
  const answers = (Array.isArray(body.answers) ? body.answers : []) as QA[];
  if (answers.length > 20 || JSON.stringify(answers).length > 10_000) {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  if (!session || !FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const data = getEphemeral<{ activity: ActivityData; weather: RaceWeather | null }>(session);
  if (!data) {
    return NextResponse.json(
      { error: 'Your Strava session has expired. Please connect again.' },
      { status: 404 }
    );
  }

  const n = (used.get(session) ?? 0) + 1;
  if (n > MAX_PER_SESSION) {
    return NextResponse.json({ error: 'That’s the limit for this run. Connect Strava again to start over.' }, { status: 429 });
  }
  used.set(session, n);

  try {
    const text = await generateRaceScript({
      activity: data.activity,
      weather: data.weather,
      answers,
      format,
    });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: 'Couldn’t generate that right now. Please try again.' },
      { status: 502 }
    );
  }
}
