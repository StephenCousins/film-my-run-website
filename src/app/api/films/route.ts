import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    // Fetch dedicated film landing pages from films table
    const filmRecords = await prisma.films.findMany({
      orderBy: { year: 'desc' },
    });

    const landingPageFilms = filmRecords.map((film) => ({
      id: `film-${film.id}`,
      title: film.title,
      subtitle: film.description || undefined,
      description: film.description || '',
      thumbnail: film.thumbnail_url || (film.youtube_id ? `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg` : ''),
      videoId: film.youtube_id || '',
      year: film.year?.toString() || null,
      location: 'Trail',
      slug: film.slug,
      stats: {
        distance: null as string | null,
        elevation: null as string | null,
        time: null as string | null,
      },
    }));

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

    // Collect video IDs that already have landing pages
    const landingPageVideoIds = new Set(
      filmRecords.map((f) => f.youtube_id).filter(Boolean)
    );

    // Transform races to films format, excluding those with dedicated landing pages
    const raceFilms = races
      .map((race) => {
        const videoId = extractYouTubeId(race.video_url || '');
        if (!videoId) return null;
        if (landingPageVideoIds.has(videoId)) return null;

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
          slug: undefined as string | undefined,
          stats: {
            distance: race.distance_km ? `${Number(race.distance_km)}km` : null,
            elevation: race.elevation ? `${race.elevation.toLocaleString()}m` : null,
            time: race.time_hms || null,
          },
        };
      })
      .filter(Boolean);

    // Landing page films first, then race films
    const films = [...landingPageFilms, ...raceFilms];

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
