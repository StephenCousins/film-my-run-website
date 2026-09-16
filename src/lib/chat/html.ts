/** Shared by notify.ts and reply-email.ts: escapes text dropped into an HTML email body. */
export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
