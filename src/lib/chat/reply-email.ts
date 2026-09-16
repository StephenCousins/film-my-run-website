function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export type ReplyEmailInput = { name: string; text: string };

/**
 * The email a user gets when Stephen replies (spec §3, "Admin inbox"). The
 * reply text is included so the email alone is enough, even if the reader
 * never opens the app.
 */
export function buildReplyEmail({ name, text }: ReplyEmailInput): { subject: string; text: string; html: string } {
  const subject = 'Stephen has replied';
  const closer = 'Open Film My Run to see the whole conversation.';
  const body = [`Hi ${name},`, '', text, '', closer].join('\n');
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #18181b;">
      <h2 style="margin: 0 0 12px; color: #f88c00;">${escapeHtml(subject)}</h2>
      <p style="margin: 0 0 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin: 0 0 20px; white-space: pre-wrap;">${escapeHtml(text)}</p>
      <p style="margin: 0; color: #52525b;">${escapeHtml(closer)}</p>
    </div>
  `;
  return { subject, text: body, html };
}
