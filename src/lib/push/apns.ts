import http2 from 'node:http2';
import { createHash } from 'node:crypto';
import { importPKCS8, SignJWT } from 'jose';

export interface ApnsConfig { keyId: string; teamId: string; key: string; topic: string }
export type ApnsEnvironment = 'sandbox' | 'production';

const HOSTS: Record<ApnsEnvironment, string> = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
};

export function apnsConfig(env: Record<string, string | undefined> = process.env): ApnsConfig | null {
  const { APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY, APNS_TOPIC } = env;
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_KEY || !APNS_TOPIC) return null;
  // Railway stores multi-line values with literal \n; restore real newlines.
  return { keyId: APNS_KEY_ID, teamId: APNS_TEAM_ID, key: APNS_KEY.replace(/\\n/g, '\n'), topic: APNS_TOPIC };
}

// Apple accepts a provider token for up to an hour; refresh after 50 minutes.
let cached: { key: string; jwt: string; at: number } | null = null;
async function providerToken(c: ApnsConfig, now = Date.now()): Promise<string> {
  const cacheKey = `${c.keyId}:${c.teamId}:${createHash('sha256').update(c.key).digest('hex')}`;
  if (cached && cached.key === cacheKey && now - cached.at < 50 * 60_000) return cached.jwt;
  const key = await importPKCS8(c.key, 'ES256');
  const jwt = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: c.keyId })
    .setIssuer(c.teamId).setIssuedAt(Math.floor(now / 1000)).sign(key);
  cached = { key: cacheKey, jwt, at: now };
  return jwt;
}

/** 410 Unregistered or 400 BadDeviceToken: the token will never work again. */
export function isDeadToken(status: number, reason?: string): boolean {
  return status === 410 || (status === 400 && reason === 'BadDeviceToken');
}

export async function sendApns(
  c: ApnsConfig,
  msg: { token: string; environment: ApnsEnvironment; payload: object },
  opts?: { host?: string },
): Promise<{ status: number; reason?: string }> {
  // Validate token: 64-200 hex characters
  if (!/^[0-9a-fA-F]{64,200}$/.test(msg.token)) {
    throw new Error('APNs token must be 64-200 hex characters');
  }

  const jwt = await providerToken(c);
  const hostUrl = opts?.host || HOSTS[msg.environment];
  const client = http2.connect(hostUrl);

  return await new Promise((resolve, reject) => {
    let done = false;
    const settle = (value: { status: number; reason?: string } | Error) => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      client.destroy();
      if (value instanceof Error) reject(value);
      else resolve(value);
    };

    // 15-second deadline for the entire operation
    const deadline = setTimeout(() => {
      settle(new Error('APNs request deadline exceeded'));
    }, 15_000);

    // Handle connection-level errors
    client.on('error', (err) => settle(err));

    const req = client.request({
      ':method': 'POST', ':path': `/3/device/${msg.token}`,
      authorization: `bearer ${jwt}`, 'apns-topic': c.topic, 'apns-push-type': 'alert', 'apns-priority': '10',
    });

    let status = 0; let body = '';
    req.setEncoding('utf8');
    req.on('response', (h) => { status = Number(h[':status']); });
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      // If we never received a status, this is an error (stream was closed prematurely)
      if (status === 0) {
        settle(new Error('APNs stream ended without response'));
        return;
      }
      let reason: string | undefined;
      if (body) {
        try {
          reason = JSON.parse(body).reason;
        } catch {
          // Ignore parse errors (e.g., HTML body from 502), leave reason undefined
        }
      }
      settle({ status, reason });
    });
    req.on('error', (err) => settle(err));
    req.on('close', () => {
      if (!done) {
        // Stream closed without 'end' event - treat as error
        settle(new Error('APNs stream closed unexpectedly'));
      }
    });
    req.setTimeout(10_000, () => { req.close(http2.constants.NGHTTP2_CANCEL); });
    req.end(JSON.stringify(msg.payload));
  });
}
