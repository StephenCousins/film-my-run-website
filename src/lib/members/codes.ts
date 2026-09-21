/** Email-code sign-in primitives (spec §2). Pure; no I/O. */
import { createHash, randomBytes, randomInt } from 'crypto';

export const CODE_TTL_MS = 10 * 60_000;
export const TOKEN_TTL_MS = 365 * 86_400_000;
export const MAX_CODE_ATTEMPTS = 5;
export const CODES_PER_HOUR = 5;

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export const makeCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const hashCode = (email: string, code: string) =>
  createHash('sha256').update(`${email}:${code}`).digest('hex');

export const makeToken = () => randomBytes(32).toString('base64url');
