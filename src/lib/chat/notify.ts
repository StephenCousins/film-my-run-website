import { Resend } from 'resend';
import { escapeHtml } from './html';

export type StephenEmailInput = { threadId: string; name: string; email: string; text: string };

/**
 * The email Stephen gets for a new question (spec §3, "Side effect"). The
 * thread link goes straight to the admin inbox so a reply from email alone
 * still needs the site (see reply-email.ts for the other direction).
 */
export function buildStephenEmail({ threadId, name, email, text }: StephenEmailInput): { subject: string; text: string; html: string } {
  const subject = `Ask Stephen: ${name}`;
  const threadUrl = `https://filmmyrun.com/admin/inbox/${threadId}`;
  const body = [
    `${name} <${email}> asked:`,
    '',
    text,
    '',
    threadUrl,
  ].join('\n');
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #18181b;">
      <h2 style="margin: 0 0 4px; color: #f88c00;">${escapeHtml(subject)}</h2>
      <p style="margin: 0 0 20px; color: #52525b; font-size: 14px;">${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <p style="margin: 0 0 20px; white-space: pre-wrap;">${escapeHtml(text)}</p>
      <p><a href="${threadUrl}" style="color: #f88c00;">Reply in the admin inbox</a></p>
    </div>
  `;
  return { subject, text: body, html };
}

export type SendFn = (msg: { from: string; to: string; replyTo: string; subject: string; html: string; text: string }) => Promise<{ error: { name: string; message: string } | null }>;

function resendSend(msg: { from: string; to: string; replyTo: string; subject: string; html: string; text: string }) {
  return new Resend(process.env.RESEND_API_KEY).emails.send(msg);
}

/**
 * Emails Stephen about a new question. A send failure is logged, not thrown:
 * the request that stored the message must not fail because the email did.
 */
export async function notifyStephen(t: StephenEmailInput, send: SendFn = resendSend): Promise<void> {
  const to = process.env.CHAT_ADMIN_EMAIL;
  if (!to) {
    console.error('Chat: CHAT_ADMIN_EMAIL is not set, cannot notify Stephen of a new message');
    return;
  }
  const { subject, text, html } = buildStephenEmail(t);
  try {
    // Reply-to is the runner, so Stephen can answer from his mail client too.
    const { error } = await send({ from: process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>', to, replyTo: t.email, subject, html, text });
    if (error) console.error('Chat: Resend error notifying Stephen', error);
  } catch (err) {
    console.error('Chat: failed to notify Stephen', err);
  }
}
