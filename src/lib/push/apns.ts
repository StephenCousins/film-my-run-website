import http2 from 'node:http2';
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
let cached: { jwt: string; at: number } | null = null;
async function providerToken(c: ApnsConfig, now = Date.now()): Promise<string> {
  if (cached && now - cached.at < 50 * 60_000) return cached.jwt;
  const key = await importPKCS8(c.key, 'ES256');
  const jwt = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: c.keyId })
    .setIssuer(c.teamId).setIssuedAt(Math.floor(now / 1000)).sign(key);
  cached = { jwt, at: now };
  return jwt;
}

/** 410 Unregistered or 400 BadDeviceToken: the token will never work again. */
export function isDeadToken(status: number, reason?: string): boolean {
  return status === 410 || (status === 400 && reason === 'BadDeviceToken');
}

export async function sendApns(
  c: ApnsConfig,
  msg: { token: string; environment: ApnsEnvironment; payload: object },
): Promise<{ status: number; reason?: string }> {
  const jwt = await providerToken(c);
  const client = http2.connect(HOSTS[msg.environment]);
  try {
    return await new Promise((resolve, reject) => {
      const req = client.request({
        ':method': 'POST', ':path': `/3/device/${msg.token}`,
        authorization: `bearer ${jwt}`, 'apns-topic': c.topic, 'apns-push-type': 'alert', 'apns-priority': '10',
      });
      let status = 0; let body = '';
      req.setEncoding('utf8');
      req.on('response', (h) => { status = Number(h[':status']); });
      req.on('data', (d) => { body += d; });
      req.on('end', () => resolve({ status, reason: body ? JSON.parse(body).reason : undefined }));
      req.on('error', reject);
      req.setTimeout(10_000, () => { req.close(http2.constants.NGHTTP2_CANCEL); reject(new Error('APNs timeout')); });
      req.end(JSON.stringify(msg.payload));
    });
  } finally {
    client.close();
  }
}
