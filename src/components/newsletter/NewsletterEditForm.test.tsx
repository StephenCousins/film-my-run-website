// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import NewsletterEditForm from './NewsletterEditForm';
import type { NewsletterPayload } from '@/lib/newsletter-template';

const payload: NewsletterPayload = { subject: 'This week', intro: 'Hello' } as NewsletterPayload;

type Call = { url: string; method: string; body?: string };
function mockFetch(saveOk: boolean) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: init?.body as string | undefined });
      if (url.startsWith('/api/newsletter/edit/') && method === 'POST')
        return new Response(JSON.stringify(saveOk ? { ok: true, html: '<p>preview</p>' } : { error: 'Invalid payload' }), { status: saveOk ? 200 : 400 });
      if (url.startsWith('/api/newsletter/edit/')) return new Response(JSON.stringify({ ok: true, recipients: 42 }));
      if (url.startsWith('/api/newsletter/approve')) return new Response(JSON.stringify({ ok: true, sent: 42 }));
      return new Response('{}', { status: 404 });
    })
  );
  return calls;
}

describe('NewsletterEditForm: Approve & Send', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('saves what is typed first, asks with the server’s count, and only sends on "Send now"', async () => {
    const calls = mockFetch(true);
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    fireEvent.change(screen.getByDisplayValue('Hello'), { target: { value: 'A long piece Stephen wrote' } });
    expect(screen.getByText('Unsaved changes')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Approve & Send/ }));
    await screen.findByText('Send this to 42 subscribers?');
    // The unsaved text went to the server before anything else.
    expect(calls[0]).toMatchObject({ url: '/api/newsletter/edit/tok', method: 'POST' });
    expect(JSON.parse(calls[0].body!).intro).toBe('A long piece Stephen wrote');
    expect(calls.some((c) => c.url.startsWith('/api/newsletter/approve'))).toBe(false);
    expect(screen.queryByText('Unsaved changes')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Send now' }));
    await screen.findByText('Sent to 42 subscribers.');
    const send = calls.find((c) => c.url.startsWith('/api/newsletter/approve'))!;
    expect(send).toMatchObject({ url: '/api/newsletter/approve?token=tok', method: 'POST' });
  });

  it('if the save fails, nothing is sent and no confirmation appears', async () => {
    const calls = mockFetch(false);
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    fireEvent.change(screen.getByDisplayValue('Hello'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: /Approve & Send/ }));
    await screen.findByText('Invalid payload');
    expect(screen.queryByText(/Send this to/)).toBeNull();
    expect(calls.filter((c) => c.url.startsWith('/api/newsletter/approve'))).toHaveLength(0);
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });

  it('Cancel sends nothing', async () => {
    const calls = mockFetch(true);
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    fireEvent.click(screen.getByRole('button', { name: /Approve & Send/ }));
    await screen.findByText('Send this to 42 subscribers?');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/Send this to/)).toBeNull());
    expect(calls.filter((c) => c.url.startsWith('/api/newsletter/approve'))).toHaveLength(0);
  });

  it('keeps a browser backup and offers it back when it differs from the saved draft', async () => {
    mockFetch(true);
    const first = render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    fireEvent.change(screen.getByDisplayValue('Hello'), { target: { value: 'Typed, never saved' } });
    expect(JSON.parse(localStorage.getItem('fmr-newsletter-draft:tok')!).intro).toBe('Typed, never saved');
    first.unmount();
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    expect(screen.getByDisplayValue('Typed, never saved')).toBeTruthy();
  });
});
