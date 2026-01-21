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
    // Fetch all Ultra races with video URLs
    const races = await prisma.race.findMany({
      where: {
        type: 'Ultra',
        videoUrl: {
          not: null,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Transform to films format
    const films = races
      .map((race) => {
        const videoId = extractYouTubeId(race.videoUrl || '');
        if (!videoId) return null;

        const year = race.date ? new Date(race.date).getFullYear().toString() : null;

        return {
          id: race.id.toString(),
          title: race.event,
          subtitle: 'Ultra Marathon',
          description: `Experience the challenge of ${race.event}${race.distanceKm ? ` - ${Number(race.distanceKm)}km` : ''} of incredible trail running.`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          videoId,
          year,
          location: race.terrain || 'Trail',
          stats: {
            distance: race.distanceKm ? `${Number(race.distanceKm)}km` : null,
            elevation: race.elevation ? `${race.elevation.toLocaleString()}m` : null,
            time: race.timeHms || null,
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
