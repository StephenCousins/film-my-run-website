/**
 * Pro proof for the chat routes (spec §3 "Pro proof"). v1 decodes the
 * StoreKit transaction JWS payload WITHOUT verifying Apple's signature; a
 * follow-up adds the x5c chain check. The gap is recorded in the app's
 * docs/DECISIONS.md: a forged header can send Stephen a message, nothing more.
 */
const BUNDLE = 'com.filmmyrun.app';
const PRODUCTS = new Set(['com.filmmyrun.app.pro.monthly', 'com.filmmyrun.app.pro.annual']);

/** `expiresDate` is the transaction's (ms); a debug proof is good for 30 days from now. */
export type ProCheck = { ok: true; productId: string; source: 'jws' | 'debug'; expiresDate: number } | { ok: false; reason: string };

export function checkProHeader(header: string | null, installId: string, env: { debugIds?: string; now?: number } = {}): ProCheck {
  const now = env.now ?? Date.now();
  if (!header) return { ok: false, reason: 'missing' };
  if (header.startsWith('debug-')) {
    // Case-insensitive: the app sends an upper-case UUID, the env may hold it either way.
    const allowed = (env.debugIds ?? process.env.CHAT_DEBUG_INSTALL_IDS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const id = header.slice('debug-'.length).toLowerCase();
    return id === installId.toLowerCase() && allowed.includes(id) ? { ok: true, productId: 'debug', source: 'debug', expiresDate: now + 30 * 86_400_000 } : { ok: false, reason: 'debug id not allowed' };
  }
  const parts = header.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.bundleId !== BUNDLE) return { ok: false, reason: 'bundle' };
  if (typeof payload.productId !== 'string' || !PRODUCTS.has(payload.productId)) return { ok: false, reason: 'product' };
  if (typeof payload.revocationDate === 'number') return { ok: false, reason: 'revoked' };
  if (typeof payload.expiresDate !== 'number' || payload.expiresDate <= now) return { ok: false, reason: 'expired' };
  return { ok: true, productId: payload.productId, source: 'jws', expiresDate: payload.expiresDate };
}

/** Test helper: an unsigned three-part token with this payload. */
export function encodeTestJws(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}
