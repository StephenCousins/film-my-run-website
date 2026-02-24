import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMostRecentMonday, buildTwirUrl, scrapeThisWeekInRunning } from '@/lib/irunfar-scraper';
import { synthesizeStories } from '@/lib/ai-news-synthesizer';
import { processNewsImage } from '@/lib/news-image-handler';

function authenticate(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  const provided = bearerToken || querySecret;

  return provided === cronSecret;
}

export async function POST(request: Request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Calculate the target Monday
    const monday = getMostRecentMonday();
    const roundupUrl = buildTwirUrl(monday);

    // Check if stories already exist for this roundup date
    const existing = await prisma.news_stories.findFirst({
      where: { roundup_date: monday },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: `Stories already exist for ${monday.toISOString().split('T')[0]}`,
        roundupDate: monday.toISOString(),
      });
    }

    // Step 1: Scrape
    console.log(`Scraping: ${roundupUrl}`);
    const sections = await scrapeThisWeekInRunning(roundupUrl);
    console.log(`Found ${sections.length} sections`);

    if (sections.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No story sections found — the page may not be published yet',
        roundupUrl,
      });
    }

    // Step 2: AI extract + rewrite
    console.log('Running AI synthesis...');
    const stories = await synthesizeStories(sections, roundupUrl);
    console.log(`Synthesized ${stories.length} stories`);

    // Step 3: Process images + insert as drafts
    let storiesCreated = 0;

    for (const story of stories) {
      // Check for duplicate by source_heading
      const duplicate = await prisma.news_stories.findFirst({
        where: { source_heading: story.sourceHeading },
      });
      if (duplicate) continue;

      // Find matching raw section for image
      const rawSection = sections.find(
        (s) => s.heading === story.sourceHeading
      ) || sections.flatMap((s) =>
        s.subsections.map((sub) => ({
          heading: sub.heading,
          paragraphs: sub.paragraphs,
          images: sub.images,
          results: [] as string[],
          subsections: [] as typeof s.subsections,
          isAdditionalRaces: true,
        }))
      ).find((s) => s.heading === story.sourceHeading);

      let imageUrl: string | null = null;
      if (rawSection) {
        imageUrl = await processNewsImage(rawSection, story.slug, monday);
      }

      await prisma.news_stories.create({
        data: {
          slug: story.slug,
          title: story.title,
          excerpt: story.excerpt,
          content: story.content,
          image_url: imageUrl,
          source_url: roundupUrl,
          source_heading: story.sourceHeading,
          roundup_date: monday,
          priority: story.priority,
          status: 'draft',
        },
      });

      storiesCreated++;
    }

    return NextResponse.json({
      success: true,
      storiesCreated,
      roundupDate: monday.toISOString(),
      roundupUrl,
    });
  } catch (error) {
    console.error('Error generating news stories:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate news stories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
