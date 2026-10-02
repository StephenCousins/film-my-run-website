/**
 * Sign in with Apple token exchange and revocation (App Review 5.1.1(v): deleting an account must
 * revoke its Apple tokens). The identity token alone can't be revoked: the app has to send the one-time
 * authorization code too, which we swap for a refresh token at sign-in and revoke on delete.
 *
 * Needs a key with Sign in with Apple enabled. SIWA_KEY_ID / SIWA_KEY if set; otherwise the APNs key,
 * which works only if that key also has Sign in with Apple ticked in the developer portal.
 * Everything here is best effort: a failed exchange never blocks a sign-in, a failed revoke never blocks
 * a delete.
 */
import { importPKCS8, SignJWT } from 'jose';

export const SIWA_CLIENT_ID = 'com.filmmyrun.app';
const APPLE = 'https://appleid.apple.com';

export interface SiwaConfig { keyId: string; teamId: string; key: string }

export function siwaConfig(env: Record<string, string | undefined> = process.env): SiwaConfig | null {
  const keyId = env.SIWA_KEY_ID ?? env.APNS_KEY_ID;
  const key = env.SIWA_KEY ?? env.APNS_KEY;
  const teamId = env.SIWA_TEAM_ID ?? env.APNS_TEAM_ID;
  if (!keyId || !key || !teamId) return null;
  return { keyId, teamId, key: key.replace(/\\n/g, '\n') };
}

export async function clientSecret(c: SiwaConfig, now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: c.keyId })
    .setIssuer(c.teamId)
    .setSubject(SIWA_CLIENT_ID)
    .setAudience(APPLE)
    .setIssuedAt(iat)
    .setExpirationTime(iat + 300)
    .sign(await importPKCS8(c.key, 'ES256'));
}

type Fetch = typeof fetch;

/** The authorization code for a refresh token, or null (logged) if Apple says no. */
export async function exchangeAppleCode(code: string, c: SiwaConfig | null = siwaConfig(), f: Fetch = fetch): Promise<string | null> {
  if (!c) return null;
  try {
    const r = await f(`${APPLE}/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: SIWA_CLIENT_ID, client_secret: await clientSecret(c), code, grant_type: 'authorization_code' }),
    });
    if (!r.ok) {
      console.warn('Apple code exchange refused:', r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const d = (await r.json()) as { refresh_token?: string };
    return d.refresh_token ?? null;
  } catch (e) {
    console.warn('Apple code exchange failed:', (e as Error).message);
    return null;
  }
}

/** Tells Apple to forget this app's grant for the user. True when Apple accepted it. */
export async function revokeAppleToken(refreshToken: string, c: SiwaConfig | null = siwaConfig(), f: Fetch = fetch): Promise<boolean> {
  if (!c) return false;
  try {
    const r = await f(`${APPLE}/auth/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: SIWA_CLIENT_ID, client_secret: await clientSecret(c), token: refreshToken, token_type_hint: 'refresh_token' }),
    });
    if (!r.ok) console.warn('Apple revoke refused:', r.status);
    return r.ok;
  } catch (e) {
    console.warn('Apple revoke failed:', (e as Error).message);
    return false;
  }
}
