import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { describe, expect, it } from 'vitest';
import { verifyAppleIdentityToken } from './apple';

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  const jwks = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, aud = 'com.filmmyrun.app', iss = 'https://appleid.apple.com') =>
    new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(iss).setAudience(aud).setSubject('apple-1').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  return { jwks, sign };
}

describe('verifyAppleIdentityToken', () => {
  it('accepts a token Apple signed for the app, lower-casing the email', async () => {
    const { jwks, sign } = await setup();
    expect(await verifyAppleIdentityToken(await sign({ email: 'Sam@Example.com' }), jwks)).toEqual({ sub: 'apple-1', email: 'sam@example.com' });
  });
  it('refuses another app, another issuer, or no email', async () => {
    const { jwks, sign } = await setup();
    expect(await verifyAppleIdentityToken(await sign({ email: 'a@b.co' }, 'com.someone.else'), jwks)).toBeNull();
    expect(await verifyAppleIdentityToken(await sign({ email: 'a@b.co' }, 'com.filmmyrun.app', 'https://evil.example'), jwks)).toBeNull();
    expect(await verifyAppleIdentityToken(await sign({}), jwks)).toBeNull();
    expect(await verifyAppleIdentityToken('not-a-jwt', jwks)).toBeNull();
  });
});
