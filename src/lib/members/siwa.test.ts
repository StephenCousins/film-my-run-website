import { describe, expect, it } from 'vitest';
import { exportPKCS8, generateKeyPair, decodeJwt, decodeProtectedHeader } from 'jose';
import { clientSecret, exchangeAppleCode, revokeAppleToken, siwaConfig } from './siwa';

async function config() {
  const { privateKey } = await generateKeyPair('ES256', { extractable: true });
  return { keyId: 'KEY123', teamId: 'TEAM456', key: await exportPKCS8(privateKey) };
}
function recorder(status = 200, body: unknown = {}) {
  const calls: { url: string; form: URLSearchParams }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, form: new URLSearchParams(String(init.body)) });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, f };
}

describe('Sign in with Apple tokens', () => {
  it('prefers the SIWA key and falls back to the APNs one', () => {
    expect(siwaConfig({ SIWA_KEY_ID: 'S', SIWA_KEY: 'k', APNS_KEY_ID: 'A', APNS_KEY: 'x', APNS_TEAM_ID: 'T' })).toEqual({ keyId: 'S', key: 'k', teamId: 'T' });
    expect(siwaConfig({ APNS_KEY_ID: 'A', APNS_KEY: 'a\\nb', APNS_TEAM_ID: 'T' })).toEqual({ keyId: 'A', key: 'a\nb', teamId: 'T' });
    expect(siwaConfig({})).toBeNull();
  });

  it('signs the client secret the way Apple asks: ES256, kid, team as issuer, app as subject', async () => {
    const c = await config();
    const jwt = await clientSecret(c, 1_000_000_000_000);
    expect(decodeProtectedHeader(jwt)).toMatchObject({ alg: 'ES256', kid: 'KEY123' });
    expect(decodeJwt(jwt)).toMatchObject({ iss: 'TEAM456', sub: 'com.filmmyrun.app', aud: 'https://appleid.apple.com', iat: 1_000_000_000, exp: 1_000_000_300 });
  });

  it('swaps the code for a refresh token', async () => {
    const { calls, f } = recorder(200, { refresh_token: 'rt-1' });
    expect(await exchangeAppleCode('code-1', await config(), f)).toBe('rt-1');
    expect(calls[0].url).toBe('https://appleid.apple.com/auth/token');
    expect(calls[0].form.get('grant_type')).toBe('authorization_code');
    expect(calls[0].form.get('code')).toBe('code-1');
  });

  it('gives null, never throws, when Apple refuses or nothing is configured', async () => {
    expect(await exchangeAppleCode('bad', await config(), recorder(400, { error: 'invalid_grant' }).f)).toBeNull();
    expect(await exchangeAppleCode('code', null, recorder().f)).toBeNull();
  });

  it('revokes the refresh token', async () => {
    const { calls, f } = recorder(200);
    expect(await revokeAppleToken('rt-1', await config(), f)).toBe(true);
    expect(calls[0].url).toBe('https://appleid.apple.com/auth/revoke');
    expect(calls[0].form.get('token')).toBe('rt-1');
    expect(calls[0].form.get('token_type_hint')).toBe('refresh_token');
    expect(await revokeAppleToken('rt-1', await config(), recorder(400).f)).toBe(false);
  });
});
