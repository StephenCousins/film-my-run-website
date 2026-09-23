/**
 * Sign in with Apple, native (the app's AuthenticationServices sheet): the
 * identity token is an RS256 JWT signed by Apple, for our bundle id. Checked
 * against Apple's published keys; no client secret is needed to verify.
 * Same approach as ClubRoute's packages/api/src/lib/socialAuth.ts.
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { AppleClaims } from './handlers';

/** The app's bundle id: the audience Apple signs the token for. */
export const APPLE_AUDIENCE = ['com.filmmyrun.app'];
let keys: JWTVerifyGetKey | undefined;

export async function verifyAppleIdentityToken(token: string, jwks?: JWTVerifyGetKey): Promise<AppleClaims | null> {
  try {
    keys ??= createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    const { payload } = await jwtVerify(token, jwks ?? keys, { issuer: 'https://appleid.apple.com', audience: APPLE_AUDIENCE, algorithms: ['RS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || !payload.email) return null;
    return { sub: payload.sub, email: payload.email.toLowerCase() };
  } catch (e) {
    // jose's errors carry no token contents; never log the token itself.
    console.warn('Apple identity token rejected:', (e as { code?: string }).code ?? (e as Error).name);
    return null;
  }
}
