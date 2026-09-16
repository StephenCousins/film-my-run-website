import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildStephenEmail, notifyStephen } from './notify';

describe('buildStephenEmail', () => {
  it('builds the subject, thread link and escaped html', () => {
    const r = buildStephenEmail({ threadId: 't1', name: 'Jo', email: 'jo@example.com', text: 'Hi <script>alert(1)</script>' });
    expect(r.subject).toBe('Ask Stephen: Jo');
    expect(r.text).toContain('Hi <script>alert(1)</script>');
    expect(r.text).toContain('https://filmmyrun.com/admin/inbox/t1');
    expect(r.html).toContain('https://filmmyrun.com/admin/inbox/t1');
    expect(r.html).not.toContain('<script>alert(1)</script>');
    expect(r.html).toContain('&lt;script&gt;');
  });
});

describe('notifyStephen', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends to the admin with the user as reply-to, so a reply from the mail client reaches them', async () => {
    vi.stubEnv('CHAT_ADMIN_EMAIL', 'stephen@filmmyrun.com');
    vi.stubEnv('RESEND_FROM_EMAIL', 'Film My Run <hello@filmmyrun.com>');
    const sent: Parameters<Parameters<typeof notifyStephen>[1] & object>[0][] = [];
    await notifyStephen({ threadId: 't1', name: 'Jo', email: 'jo@example.com', text: 'Hi' }, async (msg) => {
      sent.push(msg);
      return { error: null };
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'stephen@filmmyrun.com', from: 'Film My Run <hello@filmmyrun.com>', replyTo: 'jo@example.com', subject: 'Ask Stephen: Jo' });
  });

  it('does nothing without an admin email', async () => {
    vi.stubEnv('CHAT_ADMIN_EMAIL', '');
    const send = vi.fn(async () => ({ error: null }));
    await notifyStephen({ threadId: 't1', name: 'Jo', email: 'jo@example.com', text: 'Hi' }, send);
    expect(send).not.toHaveBeenCalled();
  });
});
