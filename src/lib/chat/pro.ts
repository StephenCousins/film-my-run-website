import { X509Certificate, verify } from 'node:crypto';

/**
 * Pro proof (spec §3 "Pro proof"): the app's StoreKit 2 transaction JWS.
 * Since 1 Oct 2026 the signature is verified: x5c chain leaf → intermediate →
 * Apple Root CA G3 (pinned below), Apple's StoreKit OIDs on leaf and
 * intermediate, ES256 over header.payload with the leaf key. Before that the
 * payload was only decoded, and a hand-built header made any account Pro
 * (auth/pro), got Club pricing (checkout) and unlocked chat + race pacing.
 */
const BUNDLE = 'com.filmmyrun.app';
const PRODUCTS = new Set(['com.filmmyrun.app.pro.monthly', 'com.filmmyrun.app.pro.annual']);

/** https://www.apple.com/certificateauthority/AppleRootCA-G3.cer, SHA-256 63:34:3A:BF:…:3E:91:79, valid to 2039. */
const APPLE_ROOT_CA_G3 = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;

const trustedRoots = [new X509Certificate(APPLE_ROOT_CA_G3)];

/** Tests only: trust the fixture root in `pro.fixtures.ts`. Throws outside vitest. */
export function trustTestRoot(pem: string): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('trustTestRoot is for tests only');
  const cert = new X509Certificate(pem);
  if (!trustedRoots.some(r => r.fingerprint256 === cert.fingerprint256)) trustedRoots.push(cert);
}

// DER-encoded OIDs Apple puts on the StoreKit signing certs (as the App Store Server Library checks).
const OID_LEAF = Buffer.from('060a2a864886f76364060b01', 'hex'); // 1.2.840.113635.100.6.11.1
const OID_INTERMEDIATE = Buffer.from('060a2a864886f76364060201', 'hex'); // 1.2.840.113635.100.6.2.1

const inDate = (c: X509Certificate, at: number) => Date.parse(c.validFrom) <= at && at <= Date.parse(c.validTo);

/** True when the JWS is signed by Apple's StoreKit chain. `at` is the moment the certs must have been valid. */
function verifyAppleJws(parts: string[], header: Record<string, unknown>, at: number): boolean {
  try {
    if (header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length !== 3) return false;
    const [leaf, intermediate, root] = header.x5c.map(c => new X509Certificate(Buffer.from(String(c), 'base64')));
    if (!trustedRoots.some(r => r.raw.equals(root.raw))) return false;
    if (!intermediate.checkIssued(root) || !intermediate.verify(root.publicKey)) return false;
    if (!leaf.checkIssued(intermediate) || !leaf.verify(intermediate.publicKey)) return false;
    if (!leaf.raw.includes(OID_LEAF) || !intermediate.raw.includes(OID_INTERMEDIATE)) return false;
    if (![leaf, intermediate, root].every(c => inDate(c, at))) return false;
    return verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url'));
  } catch {
    return false;
  }
}

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
  let jwsHeader: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    jwsHeader = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  // Certs are judged at signing time (as Apple's library does offline); the expiry check below still uses now.
  const signedAt = typeof payload.signedDate === 'number' ? payload.signedDate : now;
  if (!verifyAppleJws(parts, jwsHeader, signedAt)) return { ok: false, reason: 'signature' };
  if (payload.bundleId !== BUNDLE) return { ok: false, reason: 'bundle' };
  if (typeof payload.productId !== 'string' || !PRODUCTS.has(payload.productId)) return { ok: false, reason: 'product' };
  if (typeof payload.revocationDate === 'number') return { ok: false, reason: 'revoked' };
  if (typeof payload.expiresDate !== 'number' || payload.expiresDate <= now) return { ok: false, reason: 'expired' };
  return { ok: true, productId: payload.productId, source: 'jws', expiresDate: payload.expiresDate };
}
