export type NewMessage = { name: string; email: string; text: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL = /[\x00-\x1f\x7f]/g;

export function validateNewMessage(body: unknown): { ok: true; value: NewMessage } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Bad request' };
  const b = body as Record<string, unknown>;
  // The name becomes an email subject, so no line breaks or other control characters.
  const name = typeof b.name === 'string' ? b.name.replace(CONTROL, '').trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!name || name.length > 80) return { ok: false, error: 'Please give your name (up to 80 characters).' };
  if (!EMAIL.test(email) || email.length > 200) return { ok: false, error: 'Please give a valid email address.' };
  if (!text) return { ok: false, error: 'Write a message first.' };
  if (text.length > 2000) return { ok: false, error: 'Messages are up to 2,000 characters.' };
  return { ok: true, value: { name, email, text } };
}

export function isInstallId(v: string | null): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
