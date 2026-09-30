import { describe, it, expect, vi } from 'vitest';
import { sendIssue, recipients, sectionHeadings, type Issue, type SendDeps } from './send-issue';

function deps(issue: Issue | null) {
  let status = issue?.status ?? 'draft';
  const sent: string[] = [];
  const d: SendDeps = {
    findIssue: async () => (issue ? { ...issue, status } : null),
    claim: async () => {
      if (status !== 'draft') return false;
      status = 'sending';
      return true;
    },
    release: async () => void (status = 'draft'),
    markSent: async () => void (status = 'sent'),
    subscribers: async () => [{ email: 'a@x.com', token: 'ta' }, { email: 'b@x.com', token: 'tb' }],
    sendBatch: async (emails) => void sent.push(...emails.map((e) => e.to)),
    adminEmails: 'owner@x.com, a@x.com',
    from: 'FMR <n@x.com>',
    baseUrl: 'https://filmmyrun.com',
  };
  return { d, sent, status: () => status };
}
const issue: Issue = { id: 1, subject: 'Hi', status: 'draft', recipient_count: 0, content: { subject: 'Hi', intro: 'x' } };

describe('sendIssue', () => {
  it('sends once to subscribers plus admins, with one-click unsubscribe headers', async () => {
    const f = deps(issue);
    const batch = vi.spyOn(f.d, 'sendBatch');
    expect(await sendIssue('tok', f.d)).toEqual({ kind: 'sent', count: 3 });
    expect(f.sent).toEqual(['a@x.com', 'b@x.com', 'owner@x.com']);
    expect(batch.mock.calls[0][0][0].headers).toEqual({
      'List-Unsubscribe': '<https://filmmyrun.com/api/newsletter/unsubscribe?token=ta>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(batch.mock.calls[0][0][2].headers).toBeUndefined();
    expect(await sendIssue('tok', f.d)).toEqual({ kind: 'already', count: 0 });
    expect(f.sent).toHaveLength(3);
  });

  it('a second request while one is sending does nothing', async () => {
    const f = deps(issue);
    await f.d.claim(1);
    expect(await sendIssue('tok', f.d)).toEqual({ kind: 'busy' });
    expect(f.sent).toEqual([]);
  });

  it('a failed send goes back to draft so it can be retried', async () => {
    const f = deps(issue);
    f.d.sendBatch = async () => {
      throw new Error('resend down');
    };
    expect(await sendIssue('tok', f.d)).toEqual({ kind: 'failed', error: 'resend down' });
    expect(f.status()).toBe('draft');
  });

  it('unknown token', async () => {
    expect(await sendIssue('nope', deps(null).d)).toEqual({ kind: 'not-found' });
  });

  it('recipients and headings', async () => {
    expect((await recipients(deps(issue).d)).map((r) => r.email)).toEqual(['a@x.com', 'b@x.com', 'owner@x.com']);
    expect(sectionHeadings({ subject: 's', intro: 'i', news: [{ title: 't', url: 'u', source: 's' }], whatsNew: { text: 'w' } } as never)).toEqual([
      'Intro',
      'Trail & ultra news (1)',
      "What's new",
    ]);
  });
});
