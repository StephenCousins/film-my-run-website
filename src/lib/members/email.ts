/** The six-digit sign-in code, by Resend. No bcc: this is the runner's credential. */
import { Resend } from 'resend';

const from = () => process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';

export async function sendCodeEmail(to: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const text = [`Your Film My Run sign-in code is ${code}.`, '', 'It works for 10 minutes. If you did not ask for it, ignore this email.', '', 'Stephen'].join('\n');
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:20px;line-height:1.5">
    <div style="border-bottom:3px solid #f88c00;padding-bottom:12px;margin-bottom:20px;font-weight:700">Film My Run</div>
    <p style="margin:0 0 8px">Your sign-in code is</p>
    <p style="font-family:ui-monospace,Menlo,monospace;font-size:32px;letter-spacing:6px;margin:0 0 16px">${code}</p>
    <p style="margin:0 0 8px">It works for 10 minutes. If you did not ask for it, ignore this email.</p>
    <p style="margin:0">Stephen</p>
  </div>`;
  const { error } = await new Resend(key).emails.send({ from: from(), to, subject: `Your Film My Run code: ${code}`, text, html });
  if (error) throw new Error(error.message);
}
