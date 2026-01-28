import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export async function GET() {
  try {
    // Fetch Ultra races with video URLs from 2018 onwards
    const races = await prisma.races.findMany({
      where: {
        type: 'Ultra',
        video_url: {
          not: null,
        },
        date: {
          gte: new Date('2018-01-01'),
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Transform to films format
    const films = races
      .map((race) => {
        const videoId = extractYouTubeId(race.video_url || '');
        if (!videoId) return null;

        const year = race.date ? new Date(race.date).getFullYear().toString() : null;

        return {
          id: race.id.toString(),
          title: race.event,
          subtitle: 'Ultra Marathon',
          description: `Experience the challenge of ${race.event}${race.distance_km ? ` - ${Number(race.distance_km)}km` : ''} of incredible trail running.`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          videoId,
          year,
          location: race.terrain || 'Trail',
          stats: {
            distance: race.distance_km ? `${Number(race.distance_km)}km` : null,
            elevation: race.elevation ? `${race.elevation.toLocaleString()}m` : null,
            time: race.time_hms || null,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      films,
      total: films.length,
    });
  } catch (error) {
    console.error('Films API error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
