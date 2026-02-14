import { NextRequest, NextResponse } from 'next/server';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';
import { getAllParkruns } from '@/lib/parkrun-db';
import { z } from 'zod';

const payloadSchema = z.object({
  subject: z.string().min(1).max(200),
  intro: z.string().optional(),
  parkrun: z.object({ text: z.string() }).optional(),
  news: z.array(z.object({ title: z.string(), url: z.string().url(), source: z.string(), imageUrl: z.string().url().optional(), description: z.string().optional() })).optional(),
  blogPost: z.object({ title: z.string(), url: z.string().url(), snippet: z.string(), imageUrl: z.string().url().optional() }).optional(),
  videoOfTheWeek: z.object({ title: z.string(), url: z.string().url(), description: z.string(), thumbnailUrl: z.string().url() }).optional(),
  appOfTheWeek: z.object({ name: z.string(), url: z.string().url(), description: z.string() }).optional(),
  sessionOfTheWeek: z.object({ title: z.string(), description: z.string() }).optional(),
  trainingTip: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  scienceSection: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  nutritionTip: z.object({ text: z.string(), citation: z.string().optional() }).optional(),
  fromTheArchives: z.object({ title: z.string(), url: z.string().url(), description: z.string(), imageUrl: z.string().url().optional() }).optional(),
  whatsNew: z.object({ text: z.string() }).optional(),
});

function verifyAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return bearerToken === cronSecret;
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = payloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
    }

    const payload = result.data as NewsletterPayload;

    // Auto-populate parkrun from the parkrun database if not provided
    if (!payload.parkrun) {
      try {
        const allRuns = await getAllParkruns();
        if (allRuns.length > 0) {
          const latest = allRuns[0];
          const runDate = new Date(latest.date);
          const daysSince = Math.round((Date.now() - runDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince <= 9 && !isNaN(runDate.getTime())) {
            const timeParts = latest.time_formatted.split(':');
            const mins = parseInt(timeParts[0], 10);
            const secs = parseInt(timeParts[1], 10);
            const timeText = secs > 0 ? `${mins} minutes ${secs} seconds` : `${mins} minutes`;

            let text = `This week I ran ${latest.event} parkrun, finishing in ${timeText}`;
            if (latest.position) {
              const s = ['th', 'st', 'nd', 'rd'];
              const v = latest.position % 100;
              const suffix = s[(v - 20) % 10] || s[v] || s[0];
              text += ` in ${latest.position}${suffix} place`;
            }
            text += '.';
            payload.parkrun = { text };
          }
        }
      } catch (e) {
        console.warn('Could not auto-populate parkrun:', e);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.co.uk';
    const html = buildNewsletterHtml(payload, '#unsubscribe-preview', baseUrl);

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Newsletter preview error:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}
