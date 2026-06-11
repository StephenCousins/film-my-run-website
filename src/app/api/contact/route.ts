import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const SUBJECT_LABELS: Record<string, string> = {
  'race-filming': 'Race Filming Inquiry',
  'event-coverage': 'Event Coverage',
  'collaboration': 'Brand Collaboration',
  'tools': 'Running Tools Question',
  'training': 'Marathon Training App',
  'other': 'General Inquiry',
};

export async function POST(request: Request) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { name, email, subject, eventName, eventDate, message } = body;

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message is too long (max 5000 characters).' }, { status: 400 });
  }

  const subjectLabel = SUBJECT_LABELS[subject] || subject;
  const eventLine = eventName
    ? `Event: ${eventName}${eventDate ? ` (${eventDate})` : ''}`
    : eventDate
      ? `Event Date: ${eventDate}`
      : null;

  const textBody = [
    `New contact form submission from filmmyrun.co.uk`,
    ``,
    `From: ${name} <${email}>`,
    `Subject: ${subjectLabel}`,
    eventLine,
    ``,
    `Message:`,
    message,
  ].filter((line) => line !== null).join('\n');

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 3px solid #f88c00; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #18181b;">New Contact Form Submission</h2>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; color: #52525b; width: 120px; vertical-align: top;">From</td>
          <td style="padding: 8px 12px; color: #18181b;">${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; color: #52525b; vertical-align: top;">Subject</td>
          <td style="padding: 8px 12px; color: #18181b;">${escapeHtml(subjectLabel)}</td>
        </tr>
        ${eventLine ? `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; color: #52525b; vertical-align: top;">Event</td>
          <td style="padding: 8px 12px; color: #18181b;">${escapeHtml(eventName || '')}${eventDate ? ` (${escapeHtml(eventDate)})` : ''}</td>
        </tr>` : ''}
      </table>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 20px;">
        <h3 style="margin: 0 0 12px; color: #52525b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Message</h3>
        <div style="color: #18181b; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
      </div>
      <p style="margin-top: 24px; font-size: 12px; color: #a1a1aa;">
        Sent via filmmyrun.co.uk contact form
      </p>
    </div>
  `;

  try {
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';

    await resend.emails.send({
      from: fromEmail,
      to: 'stephen@filmmyrun.com',
      replyTo: email,
      subject: `[Film My Run] ${subjectLabel} — ${name}`,
      text: textBody,
      html: htmlBody,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form email failed:', err);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
