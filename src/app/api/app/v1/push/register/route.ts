import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withAppApi } from '@/lib/app-api/rate-limit';

// News push: the app registers its APNs token and whether the daily news push is on.
// The app's FMRAPIClient.post sends a flat JSON map of strings, so news is "true"/"false".
export const dynamic = 'force-dynamic';

export const registerSchema = z.object({
  token: z.string().regex(/^[0-9a-fA-F]{64,200}$/),
  environment: z.enum(['sandbox', 'production']),
  news: z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]),
});

export const POST = withAppApi(
  async (request) => {
    const parsed = registerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid registration' }, { status: 400 });
    }
    const { token, environment, news } = parsed.data;
    await prisma.push_devices.upsert({
      where: { token },
      create: { token, environment, news },
      update: { environment, news, last_seen_at: new Date(), invalid_at: null },
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  },
  { limit: 30 }
);
