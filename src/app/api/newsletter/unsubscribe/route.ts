import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse(unsubscribePage('Invalid unsubscribe link.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const subscriber = await prisma.newsletter_subscribers.findUnique({
      where: { token },
    });

    if (!subscriber) {
      return new NextResponse(unsubscribePage('This unsubscribe link is not valid.', false), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (subscriber.status === 'unsubscribed') {
      return new NextResponse(unsubscribePage('You have already been unsubscribed.', true), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    await prisma.newsletter_subscribers.update({
      where: { token },
      data: {
        status: 'unsubscribed',
        unsubscribed_at: new Date(),
      },
    });

    return new NextResponse(unsubscribePage('You have been successfully unsubscribed.', true), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new NextResponse(unsubscribePage('Something went wrong. Please try again.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function unsubscribePage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribe - Film My Run</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
  <div style="text-align: center; max-width: 400px; padding: 48px 24px;">
    <div style="font-size: 48px; margin-bottom: 16px;">${success ? '&#10003;' : '&#10007;'}</div>
    <h1 style="font-size: 22px; color: #18181b; margin-bottom: 12px;">Film My Run</h1>
    <p style="color: ${success ? '#52525b' : '#ef4444'}; font-size: 15px; line-height: 1.5;">${message}</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.co.uk'}" style="display: inline-block; margin-top: 24px; color: #f88c00; text-decoration: none; font-size: 14px;">Visit Film My Run</a>
  </div>
</body>
</html>`;
}
