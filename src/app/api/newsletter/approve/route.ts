import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';
import { buildNewsletterHtml, type NewsletterPayload } from '@/lib/newsletter-template';

function htmlPage(title: string, message: string, color: string = '#18181b'): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
  <div style="text-align: center; padding: 48px; max-width: 480px;">
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${color};">${title}</h1>
    <p style="margin: 0; font-size: 16px; color: #52525b; line-height: 1.6;">${message}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return htmlPage('Invalid Link', 'No approval token provided.', '#ef4444');
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return htmlPage('Configuration Error', 'RESEND_API_KEY is not configured.', '#ef4444');
  }

  try {
    const issue = await prisma.newsletter_issues.findUnique({
      where: { approve_token: token },
    });

    if (!issue) {
      return htmlPage('Not Found', 'This approval link is invalid or has expired.', '#ef4444');
    }

    if (issue.status === 'sent') {
      return htmlPage(
        'Already Sent',
        `This newsletter was already sent to ${issue.recipient_count} subscriber${issue.recipient_count === 1 ? '' : 's'}.`
      );
    }

    // Parse the stored payload
    const payload = issue.content as unknown as NewsletterPayload;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';

    // Fetch all active subscribers
    const subscribers = await prisma.newsletter_subscribers.findMany({
      where: { status: 'active' },
      select: { email: true, token: true },
    });

    // Include admin as a subscriber too
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
      // Mark as sent even with 0 subscribers to prevent re-approval
      await prisma.newsletter_issues.update({
        where: { id: issue.id },
        data: { status: 'sent', recipient_count: 0 },
      });
      return htmlPage('No Subscribers', 'Newsletter approved but there are no active subscribers to send to.');
    }

    // Send in batches of 100
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';
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

    // Update issue status
    await prisma.newsletter_issues.update({
      where: { id: issue.id },
      data: { status: 'sent', recipient_count: totalSent },
    });

    return htmlPage(
      'Newsletter Sent!',
      `"${payload.subject}" has been sent to ${totalSent} subscriber${totalSent === 1 ? '' : 's'}.`,
      '#16a34a'
    );
  } catch (error) {
    console.error('Newsletter approve error:', error);
    return htmlPage('Error', 'Something went wrong while sending the newsletter. Please try again.', '#ef4444');
  }
}
