import { NextRequest, NextResponse } from 'next/server';
import { getEphemeral } from '@/lib/racescript/store';
import { generateRaceScript, type QA } from '@/lib/racescript/generate';
import type { OutputFormat } from '@/lib/racescript/voice';
import type { ActivityData } from '@/lib/racescript/strava';
import type { RaceWeather } from '@/lib/racescript/weather';

const FORMATS: OutputFormat[] = ['race-report', 'blog', 'instagram', 'facebook'];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const session = typeof body.session === 'string' ? body.session : '';
  const format = body.format as OutputFormat;
  const answers = (Array.isArray(body.answers) ? body.answers : []) as QA[];

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
