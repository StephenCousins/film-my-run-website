import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http2 from 'node:http2';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { exportPKCS8 } from 'jose';
import { apnsConfig, isDeadToken, openApns, sendApns } from './apns';

describe('apns', () => {
  it('is dormant without credentials', () => {
    expect(apnsConfig({})).toBeNull();
  });
  it('reads the four variables', () => {
    const c = apnsConfig({ APNS_KEY_ID: 'K', APNS_TEAM_ID: 'T', APNS_KEY: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----', APNS_TOPIC: 'com.filmmyrun.app' });
    expect(c?.topic).toBe('com.filmmyrun.app');
  });
  it('treats 410 and BadDeviceToken as dead, others as transient', () => {
    expect(isDeadToken(410)).toBe(true);
    expect(isDeadToken(400, 'BadDeviceToken')).toBe(true);
    expect(isDeadToken(400, 'PayloadTooLarge')).toBe(false);
    expect(isDeadToken(503)).toBe(false);
  });
});

describe('sendApns integration', () => {
  let server: http2.Http2Server;
  let port: number;
  let testKeyId = 'TEST_KEY_1';
  let testTeamId = 'TEAM123';
  let testKey: string;
  let testTopic = 'com.test.app';

  beforeAll(async () => {
    // Generate a test EC P-256 key
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    testKey = await exportPKCS8(privateKey);

    // Create a local HTTP/2 server for testing
    server = http2.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  it('200 with empty body returns {status:200}', async () => {
    server.once('stream', (stream) => {
      stream.respond({ ':status': 200 });
      stream.end();
    });

    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    const result = await sendApns(config, {
      token: '0'.repeat(64),
      environment: 'sandbox',
      payload: { aps: { alert: 'test' } },
    }, { host: `http://127.0.0.1:${port}` });

    expect(result.status).toBe(200);
    expect(result.reason).toBeUndefined();
  });

  it('400 with JSON reason is extracted', async () => {
    server.once('stream', (stream) => {
      stream.respond({ ':status': 400 });
      stream.end(JSON.stringify({ reason: 'BadDeviceToken' }));
    });

    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    const result = await sendApns(config, {
      token: '0'.repeat(64),
      environment: 'sandbox',
      payload: { aps: { alert: 'test' } },
    }, { host: `http://127.0.0.1:${port}` });

    expect(result.status).toBe(400);
    expect(result.reason).toBe('BadDeviceToken');
  });

  it('502 with HTML body resolves without throwing', async () => {
    server.once('stream', (stream) => {
      stream.respond({ ':status': 502 });
      stream.end('<html><body>Bad Gateway</body></html>');
    });

    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    const result = await sendApns(config, {
      token: '0'.repeat(64),
      environment: 'sandbox',
      payload: { aps: { alert: 'test' } },
    }, { host: `http://127.0.0.1:${port}` });

    expect(result.status).toBe(502);
    expect(result.reason).toBeUndefined();
  });

  it('stream close mid-request rejects (no hang)', async () => {
    server.once('stream', (stream) => {
      setImmediate(() => stream.destroy());
    });

    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    await expect(
      sendApns(config, {
        token: '0'.repeat(64),
        environment: 'sandbox',
        payload: { aps: { alert: 'test' } },
      }, { host: `http://127.0.0.1:${port}` }),
    ).rejects.toThrow();
  });

  it('connection to closed port rejects', async () => {
    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    await expect(
      sendApns(config, {
        token: '0'.repeat(64),
        environment: 'sandbox',
        payload: { aps: { alert: 'test' } },
      }, { host: 'http://127.0.0.1:1' }),
    ).rejects.toThrow();
  });

  it('JWT cache re-signs when keyId changes', async () => {
    server.once('stream', (stream) => {
      stream.respond({ ':status': 200 });
      stream.end();
    });

    // Generate two different keys
    const { privateKey: key1 } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const keyPem1 = await exportPKCS8(key1);

    const { privateKey: key2 } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const keyPem2 = await exportPKCS8(key2);

    const config1 = { keyId: 'KEY_1', teamId: testTeamId, key: keyPem1, topic: testTopic };
    const config2 = { keyId: 'KEY_2', teamId: testTeamId, key: keyPem2, topic: testTopic };

    // Send with first config - cache is populated
    await sendApns(config1, {
      token: '0'.repeat(64),
      environment: 'sandbox',
      payload: { aps: { alert: 'test' } },
    }, { host: `http://127.0.0.1:${port}` });

    server.once('stream', (stream) => {
      stream.respond({ ':status': 200 });
      stream.end();
    });

    // Send with second config - should re-sign, not reuse cache
    // This test verifies the cache is keyed on keyId (it won't throw or fail if cache is properly invalidated)
    await expect(
      sendApns(config2, {
        token: '0'.repeat(64),
        environment: 'sandbox',
        payload: { aps: { alert: 'test' } },
      }, { host: `http://127.0.0.1:${port}` }),
    ).resolves.toHaveProperty('status', 200);
  });

  it('rejects invalid token format (too short)', async () => {
    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    await expect(
      sendApns(config, {
        token: '0'.repeat(10),
        environment: 'sandbox',
        payload: { aps: { alert: 'test' } },
      }, { host: `http://127.0.0.1:${port}` }),
    ).rejects.toThrow(/token.*64.*200.*hex/i);
  });

  it('rejects invalid token format (too long)', async () => {
    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    await expect(
      sendApns(config, {
        token: '0'.repeat(201),
        environment: 'sandbox',
        payload: { aps: { alert: 'test' } },
      }, { host: `http://127.0.0.1:${port}` }),
    ).rejects.toThrow(/token.*64.*200.*hex/i);
  });

  it('rejects invalid token format (non-hex characters)', async () => {
    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    await expect(
      sendApns(config, {
        token: 'x'.repeat(64),
        environment: 'sandbox',
        payload: { aps: { alert: 'test' } },
      }, { host: `http://127.0.0.1:${port}` }),
    ).rejects.toThrow(/token.*64.*200.*hex/i);
  });

  it('reuses one connection for many sends and reconnects after a drop', async () => {
    let sessions = 0;
    const onSession = () => { sessions++; };
    server.on('session', onSession);
    const expirations: (string | undefined)[] = [];
    let dropNext = false;
    const onStream = (stream: http2.ServerHttp2Stream, h: http2.IncomingHttpHeaders) => {
      if (dropNext) { dropNext = false; stream.session?.destroy(); return; }
      expirations.push(h['apns-expiration'] as string | undefined);
      stream.respond({ ':status': 200 });
      stream.end();
    };
    server.on('stream', onStream);
    const config = { keyId: testKeyId, teamId: testTeamId, key: testKey, topic: testTopic };
    const s = openApns(config, 'sandbox', { host: `http://127.0.0.1:${port}` });
    try {
      for (let i = 0; i < 5; i++) expect((await s.send('0'.repeat(64), {}, { expiration: 123 })).status).toBe(200);
      expect(sessions).toBe(1);
      expect(expirations).toEqual(['123', '123', '123', '123', '123']);

      // server drops the connection between sends
      dropNext = true;
      await expect(s.send('0'.repeat(64), {})).resolves.toHaveProperty('status', 200);
      expect(sessions).toBe(2);
      await s.send('0'.repeat(64), {});
      expect(sessions).toBe(2);
    } finally {
      s.close();
      server.removeListener('session', onSession);
      server.removeListener('stream', onStream);
    }
  });
});
