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

export interface ApnsSession {
  send(token: string, payload: object, opts?: { expiration?: number }): Promise<{ status: number; reason?: string }>;
  close(): void;
}

/**
 * One HTTP/2 connection reused for many sends (Apple treats rapid connect/disconnect as abuse).
 * Connects lazily; if the session errors or closes, the next send reconnects, and a send that
 * dies on a dropped connection is retried once on a fresh one.
 */
export function openApns(c: ApnsConfig, environment: ApnsEnvironment, opts?: { host?: string }): ApnsSession {
  const hostUrl = opts?.host || HOSTS[environment];
  let client: http2.ClientHttp2Session | null = null;
  let closed = false;

  const session = (): http2.ClientHttp2Session => {
    if (client && !client.destroyed && !client.closed) return client;
    const s = http2.connect(hostUrl);
    s.on('error', () => { /* per-request listeners report it; this stops an unhandled 'error' */ });
    s.on('close', () => { if (client === s) client = null; });
    client = s;
    return s;
  };

  const once = async (token: string, payload: object, expiration?: number) => {
    const jwt = await providerToken(c);
    const s = session();
    return await new Promise<{ status: number; reason?: string }>((resolve, reject) => {
      let done = false;
      let req: http2.ClientHttp2Stream | undefined;
      const settle = (value: { status: number; reason?: string } | Error, killSession = false) => {
        if (done) return;
        done = true;
        clearTimeout(deadline);
        s.off('error', onError);
        s.off('close', onClose);
        if (killSession) s.destroy();
        else if (req && !req.closed) req.close(http2.constants.NGHTTP2_CANCEL);
        if (value instanceof Error) reject(value);
        else resolve(value);
      };
      const onError = (err: Error) => settle(err, true);
      const onClose = () => settle(new Error('APNs session closed'), true);
      // 15-second deadline for the entire operation; a hung request poisons the session
      const deadline = setTimeout(() => settle(new Error('APNs request deadline exceeded'), true), 15_000);
      s.on('error', onError);
      s.on('close', onClose);

      const headers: http2.OutgoingHttpHeaders = {
        ':method': 'POST', ':path': `/3/device/${token}`,
        authorization: `bearer ${jwt}`, 'apns-topic': c.topic, 'apns-push-type': 'alert', 'apns-priority': '10',
      };
      if (expiration !== undefined) headers['apns-expiration'] = String(expiration);
      try { req = s.request(headers); } catch (e) { settle(e as Error, true); return; }

      let status = 0; let body = '';
      req.setEncoding('utf8');
      req.on('response', (h) => { status = Number(h[':status']); });
      req.on('data', (d) => { body += d; });
      req.on('end', () => {
        if (status === 0) { settle(new Error('APNs stream ended without response')); return; }
        let reason: string | undefined;
        if (body) {
          try { reason = JSON.parse(body).reason; } catch { /* e.g. HTML body from a 502 */ }
        }
        settle({ status, reason });
      });
      req.on('error', (err) => settle(err));
      req.on('close', () => { if (!done) settle(new Error('APNs stream closed unexpectedly')); });
      req.setTimeout(10_000, () => { req?.close(http2.constants.NGHTTP2_CANCEL); });
      req.end(JSON.stringify(payload));
    });
  };

  return {
    async send(token, payload, o) {
      // Validate token: 64-200 hex characters
      if (!/^[0-9a-fA-F]{64,200}$/.test(token)) throw new Error('APNs token must be 64-200 hex characters');
      if (closed) throw new Error('APNs session is closed');
      const wasConnected = !!client && !client.destroyed && !client.closed;
      try {
        return await once(token, payload, o?.expiration);
      } catch (e) {
        // A reused connection may have been dropped by the server between sends: retry once on a fresh one.
        if (!wasConnected || closed) throw e;
        return await once(token, payload, o?.expiration);
      }
    },
    close() { closed = true; client?.destroy(); client = null; },
  };
}

export async function sendApns(
  c: ApnsConfig,
  msg: { token: string; environment: ApnsEnvironment; payload: object; expiration?: number },
  opts?: { host?: string },
): Promise<{ status: number; reason?: string }> {
  const s = openApns(c, msg.environment, opts);
  try {
    return await s.send(msg.token, msg.payload, { expiration: msg.expiration });
  } finally {
    s.close();
  }
}
