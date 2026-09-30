import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({ sendIssue: vi.fn(), issue: null as unknown }));
vi.mock('@/lib/db', () => ({ prisma: { newsletter_issues: { findUnique: async () => h.issue } } }));
vi.mock('@/lib/newsletter/send-deps', () => ({ liveSendDeps: () => ({}), liveRecipientCount: async () => 7 }));
vi.mock('@/lib/newsletter/send-issue', async (orig) => ({ ...(await orig<typeof import('@/lib/newsletter/send-issue')>()), sendIssue: h.sendIssue }));

import { GET, POST } from './route';

const url = 'https://filmmyrun.com/api/newsletter/approve?token=tok';

describe('/api/newsletter/approve', () => {
  beforeEach(() => {
    h.sendIssue.mockReset();
    h.issue = { id: 1, subject: 'Hi', status: 'draft', recipient_count: 0, content: { subject: 'Big <week>', intro: 'x', whatsNew: { text: 'w' } } };
  });

  it('GET (the emailed link, a scanner prefetch) never sends: it shows the subject, sections and a POST button', async () => {
    const res = await GET(new NextRequest(url));
    const html = await res.text();
    expect(h.sendIssue).not.toHaveBeenCalled();
    expect(html).toContain('Big &lt;week&gt;');
    expect(html).toContain('<li style="margin:4px 0">Intro</li>');
    expect(html).toContain("What&#39;s new");
    expect(html).toContain('<form method="POST" action="/api/newsletter/approve?token=tok"');
    expect(html).toContain('Send now to 7 subscribers');
  });

  it('GET for a sent issue says so, still without sending', async () => {
    h.issue = { ...(h.issue as object), status: 'sent', recipient_count: 5 };
    expect(await (await GET(new NextRequest(url))).text()).toContain('already sent to 5 subscribers');
    expect(h.sendIssue).not.toHaveBeenCalled();
  });

  it('POST sends: JSON for the editor, a page for the form', async () => {
    vi.stubEnv('RESEND_API_KEY', 'k');
    h.sendIssue.mockResolvedValue({ kind: 'sent', count: 7 });
    const json = await POST(new NextRequest(url, { method: 'POST', headers: { Accept: 'application/json' } }));
    expect(await json.json()).toEqual({ ok: true, sent: 7 });
    const page = await POST(new NextRequest(url, { method: 'POST' }));
    expect(await page.text()).toContain('Sent to 7 subscribers');
    expect(h.sendIssue).toHaveBeenCalledTimes(2);
    h.sendIssue.mockResolvedValue({ kind: 'busy' });
    expect((await POST(new NextRequest(url, { method: 'POST', headers: { Accept: 'application/json' } }))).status).toBe(409);
  });
});
