import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get the day of year (1-366)
 */
function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export async function GET() {
  try {
    // Fetch Ultra races with video URLs from 2018 onwards
    const races = await prisma.race.findMany({
      where: {
        type: 'Ultra',
        videoUrl: {
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

    if (races.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No featured videos available' },
        { status: 404 }
      );
    }

    // Select video based on day of year (rotates daily)
    const dayOfYear = getDayOfYear();
    const selectedIndex = dayOfYear % races.length;
    const race = races[selectedIndex];

    // Extract YouTube video ID
    const videoId = extractYouTubeId(race.videoUrl || '');

    if (!videoId) {
      // Fallback to first race with valid video ID
      const validRace = races.find(r => extractYouTubeId(r.videoUrl || ''));
      if (!validRace) {
        return NextResponse.json(
          { ok: false, error: 'No valid video URLs found' },
          { status: 404 }
        );
      }
    }

    // Format the response
    const year = race.date ? new Date(race.date).getFullYear().toString() : null;

    const response = {
      ok: true,
      video: {
        title: race.event,
        subtitle: race.type || 'Ultra Marathon',
        description: `Experience the challenge of ${race.event}${race.distanceKm ? ` - ${Number(race.distanceKm)}km` : ''} of incredible trail running.`,
        videoId: extractYouTubeId(race.videoUrl || ''),
        thumbnail: `https://img.youtube.com/vi/${extractYouTubeId(race.videoUrl || '')}/hqdefault.jpg`,
        year,
        location: race.terrain || 'Trail',
        stats: {
          distance: race.distanceKm ? `${Number(race.distanceKm)}km` : 'N/A',
          elevation: race.elevation ? `${race.elevation.toLocaleString()}m` : 'N/A',
          time: race.timeHms || 'N/A',
        },
        // Include all videos count for context
        totalVideos: races.length,
        currentIndex: selectedIndex + 1,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Featured video API error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
