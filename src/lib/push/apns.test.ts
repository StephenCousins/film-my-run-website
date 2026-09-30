import { describe, it, expect } from 'vitest';
import { apnsConfig, isDeadToken } from './apns';

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
