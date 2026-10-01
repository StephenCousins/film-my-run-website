import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * `Authorization: Bearer <secret>`, compared in constant time (hashed first so
 * lengths match). A missing secret refuses everyone. Never the query string:
 * URLs land in logs.
 */
export function hasBearerSecret(req: Request, secret: string | undefined = process.env.CRON_SECRET): boolean {
  const header = req.headers.get('authorization') ?? '';
  if (!secret || !/^Bearer /i.test(header)) return false;
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(header.slice(7).trim()), digest(secret));
}
