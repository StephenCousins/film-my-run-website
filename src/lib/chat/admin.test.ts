import { afterEach, describe, expect, it, vi } from 'vitest';
import { isChatAdmin } from './admin';

describe('isChatAdmin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('matches the admin email case-insensitively', () => {
    vi.stubEnv('CHAT_ADMIN_EMAIL', 'Stephen@FilmMyRun.com');
    expect(isChatAdmin({ user: { email: 'stephen@filmmyrun.com' } })).toBe(true);
  });

  it('refuses any other email, no session, or an empty env', () => {
    vi.stubEnv('CHAT_ADMIN_EMAIL', 'stephen@filmmyrun.com');
    expect(isChatAdmin({ user: { email: 'someone.else@example.com' } })).toBe(false);
    expect(isChatAdmin(null)).toBe(false);
    expect(isChatAdmin(undefined)).toBe(false);
    expect(isChatAdmin({ user: { email: null } })).toBe(false);

    vi.stubEnv('CHAT_ADMIN_EMAIL', '');
    expect(isChatAdmin({ user: { email: 'stephen@filmmyrun.com' } })).toBe(false);
  });
});
