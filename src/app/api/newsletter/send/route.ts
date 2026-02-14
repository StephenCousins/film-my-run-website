import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';
import { getAllParkruns, getVenueCoordinates } from '@/lib/parkrun-db';
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

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'clear skies', 1: 'mostly clear skies', 2: 'partly cloudy skies',
  3: 'overcast skies', 45: 'foggy conditions', 48: 'foggy conditions',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow',
  80: 'light rain showers', 81: 'rain showers', 82: 'heavy rain showers',
  95: 'thunderstorms',
};

async function fetchWeather(lat: number, lng: number, date: string): Promise<{ temp: number; description: string } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,weathercode&timezone=Europe/London&start_date=${date}&end_date=${date}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const temp = Math.round(data.daily?.temperature_2m_max?.[0] ?? 0);
    const code = data.daily?.weathercode?.[0] ?? -1;
    const description = WMO_DESCRIPTIONS[code] || 'mixed conditions';
    return { temp, description };
  } catch {
    return null;
  }
}

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

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const result = payloadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.errors }, { status: 400 });
    }

    const payload = result.data as NewsletterPayload;

    // Auto-populate news from the articles table if not provided
    if (!payload.news || payload.news.length === 0) {
      const recentArticles = await prisma.articles.findMany({
        orderBy: { pub_date: 'desc' },
        take: 3,
        select: { title: true, link: true, source: true, description: true, image_url: true },
      });

      if (recentArticles.length > 0) {
        payload.news = recentArticles.map((a) => ({
          title: a.title,
          url: a.link,
          source: a.source,
          description: a.description || undefined,
          imageUrl: a.image_url || undefined,
        }));
      }
    }

    // Auto-populate parkrun from the parkrun database if not provided
    if (!payload.parkrun) {
      try {
        const allRuns = await getAllParkruns();
        if (allRuns.length > 0) {
          const latest = allRuns[0]; // sorted by date DESC
          const runDate = new Date(latest.date);
          const daysSince = Math.round((Date.now() - runDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince <= 9 && !isNaN(runDate.getTime())) {
            const timeParts = latest.time_formatted.split(':');
            const mins = parseInt(timeParts[0], 10);
            const secs = parseInt(timeParts[1], 10);
            const timeText = secs > 0 ? `${mins} minutes ${secs} seconds` : `${mins} minutes`;
            const dateStr = runDate.toISOString().split('T')[0];

            // Fetch venue coordinates then weather
            const venueCoords = await getVenueCoordinates().catch(() => []);
            const coords = venueCoords.find(v => v.event.toLowerCase() === latest.event.toLowerCase());
            const weather = coords ? await fetchWeather(coords.latitude, coords.longitude, dateStr) : null;

            let text = `This week I headed to ${latest.event} parkrun`;

            // Add weather
            if (weather) {
              text += ` — ${weather.temp}°C with ${weather.description}`;
            }

            text += `. I finished in ${timeText}`;
            if (latest.position) {
              text += ` in ${latest.position}${ordinalSuffix(latest.position)} place`;
            }
            text += '. We\'ll get the video out soon!';

            payload.parkrun = { text };
          }
        }
      } catch (e) {
        console.warn('Could not auto-populate parkrun:', e);
      }
    }

    const resend = new Resend(resendKey);

    // Fetch all active subscribers
    const subscribers = await prisma.newsletter_subscribers.findMany({
      where: { status: 'active' },
      select: { email: true, token: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.co.uk';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';

    // Always send a copy to the admin
    const adminEmail = process.env.NEWSLETTER_ADMIN_EMAIL;
    if (adminEmail) {
      const adminEmails = adminEmail.split(',').map((e) => e.trim()).filter(Boolean);
      for (const email of adminEmails) {
        const isSubscriber = subscribers.some((s) => s.email === email);
        if (!isSubscriber) {
          subscribers.push({ email, token: 'admin' });
        }
      }
    }

    if (subscribers.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, subject: payload.subject, message: 'No active subscribers.' });
    }

    // Send in batches of 100 (Resend batch API limit)
    let totalSent = 0;
    for (let i = 0; i < subscribers.length; i += 100) {
      const batch = subscribers.slice(i, i + 100);
      const emails = batch.map((sub) => ({
        from: fromEmail,
        to: sub.email,
        subject: payload.subject,
        html: buildNewsletterHtml(
          payload,
          sub.token === 'admin' ? '#' : `${baseUrl}/api/newsletter/unsubscribe?token=${sub.token}`,
          baseUrl
        ),
      }));

      await resend.batch.send(emails);
      totalSent += batch.length;
    }

    // Record the issue
    await prisma.newsletter_issues.create({
      data: {
        subject: payload.subject,
        content: body,
        recipient_count: totalSent,
      },
    });

    return NextResponse.json({ ok: true, sent: totalSent, subject: payload.subject });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 });
  }
}
