import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatAdminMetadata, isChatAdmin } from './admin';

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

describe('chatAdminMetadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const deny = () => {
    throw new Error('NEXT_NOT_FOUND');
  };

  it('gives the admin the title and no indexing', () => {
    vi.stubEnv('CHAT_ADMIN_EMAIL', 'stephen@filmmyrun.com');
    expect(chatAdminMetadata({ user: { email: 'stephen@filmmyrun.com' } }, 'Ask Stephen — Inbox', deny)).toEqual({
      title: 'Ask Stephen — Inbox',
      robots: { index: false, follow: false },
    });
  });

  it('denies anyone else before any metadata exists, so the shell cannot carry the title', () => {
    vi.stubEnv('CHAT_ADMIN_EMAIL', 'stephen@filmmyrun.com');
    expect(() => chatAdminMetadata({ user: { email: 'someone.else@example.com' } }, 'Ask Stephen — Inbox', deny)).toThrow('NEXT_NOT_FOUND');
    expect(() => chatAdminMetadata(null, 'Ask Stephen — Inbox', deny)).toThrow('NEXT_NOT_FOUND');
  });
});
