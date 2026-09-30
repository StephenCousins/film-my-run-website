/** The double opt-in email for an address that unsubscribed and typed itself into the footer form. */
import { Resend } from 'resend';
import { confirmToken } from './consent';

const WEEK = 7 * 24 * 3600 * 1000;

export const confirmSecret = () => process.env.NEWSLETTER_CONFIRM_SECRET || process.env.NEXTAUTH_SECRET || '';

export function confirmUrl(email: string, now = Date.now()) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://filmmyrun.com';
  const token = confirmToken(email, confirmSecret(), now + WEEK);
  return `${base}/api/newsletter/confirm?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;
}

export async function sendConfirmation(email: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !confirmSecret()) {
    console.warn('Newsletter confirmation not sent: RESEND_API_KEY or a secret is missing');
    return;
  }
  const url = confirmUrl(email);
  const { error } = await new Resend(key).emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>',
    to: email,
    subject: 'Confirm you want the Film My Run newsletter',
    text: `You (or someone using your address) asked to get the Film My Run newsletter again.\n\nConfirm here: ${url}\n\nIf that wasn't you, ignore this email and nothing changes.`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:20px;line-height:1.5">
      <div style="border-bottom:3px solid #f88c00;padding-bottom:12px;margin-bottom:20px;font-weight:700">Film My Run</div>
      <p>You (or someone using your address) asked to get the Film My Run newsletter again.</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#f88c00;color:#000;font-weight:700;text-decoration:none;border-radius:999px">Yes, send me the newsletter</a></p>
      <p style="color:#71717a;font-size:13px">If that wasn't you, ignore this email and nothing changes.</p>
    </div>`,
  });
  if (error) throw new Error(error.message);
}
