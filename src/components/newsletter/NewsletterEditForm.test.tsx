// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import NewsletterEditForm, { AUTOSAVE_MS, RETRY_MS } from './NewsletterEditForm';
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

describe('NewsletterEditForm: autosave', () => {
  type Save = { body: Record<string, unknown>; keepalive?: boolean; resolve: (ok: boolean) => void };
  let saves: Save[];
  /** Each save waits until the test answers it, ok or not. */
  function manualFetch() {
    saves = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((res) =>
            saves.push({
              body: JSON.parse(init!.body as string),
              keepalive: init!.keepalive,
              resolve: (ok) => res(new Response(JSON.stringify(ok ? { ok: true, html: 'p' } : { error: 'down' }), { status: ok ? 200 : 500 })),
            })
          )
      )
    );
  }
  const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
  const answer = (i: number, ok: boolean) => act(async () => saves[i].resolve(ok));
  const backup = () => JSON.parse(localStorage.getItem('fmr-newsletter-draft:tok') ?? 'null')?.intro;
  const type = (from: string, to: string) => fireEvent.change(screen.getByDisplayValue(from), { target: { value: to } });

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    manualFetch();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('saves soon after typing stops, then shows "Saved" and drops the browser copy', async () => {
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    type('Hello', 'H');
    await tick(AUTOSAVE_MS / 2);
    type('H', 'Hi there');
    await tick(AUTOSAVE_MS - 1);
    expect(saves).toHaveLength(0); // still typing
    await tick(1);
    expect(saves).toHaveLength(1);
    expect(saves[0].body.intro).toBe('Hi there');
    await answer(0, true);
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(backup()).toBeUndefined();
  });

  it('tries again after a failed autosave, and says so meanwhile', async () => {
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    type('Hello', 'Changed');
    await tick(AUTOSAVE_MS);
    await answer(0, false);
    expect(screen.getByText(/couldn’t save, trying again/)).toBeTruthy();
    expect(backup()).toBe('Changed'); // still safe in the browser
    await tick(RETRY_MS[0] - 1);
    expect(saves).toHaveLength(1);
    await tick(1);
    expect(saves).toHaveLength(2);
    await answer(1, true);
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('saves at once when a field loses focus', async () => {
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    type('Hello', 'Blurred');
    fireEvent.blur(screen.getByDisplayValue('Blurred'));
    await tick(0);
    expect(saves).toHaveLength(1);
    expect(saves[0].body.intro).toBe('Blurred');
  });

  it('saves with keepalive when the tab is hidden or closed', async () => {
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    type('Hello', 'Leaving');
    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.mockRestore();
    await tick(0);
    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({ keepalive: true, body: { intro: 'Leaving' } });
    await answer(0, true);
    // Nothing new: closing the tab now sends nothing more.
    window.dispatchEvent(new Event('pagehide'));
    await tick(0);
    expect(saves).toHaveLength(1);
  });

  it('a save that finishes after more typing keeps the newer browser copy, then saves that too', async () => {
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    type('Hello', 'First');
    await tick(AUTOSAVE_MS);
    expect(saves).toHaveLength(1);
    type('First', 'First and more');
    await answer(0, true);
    expect(backup()).toBe('First and more');
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    await tick(AUTOSAVE_MS);
    expect(saves).toHaveLength(2);
    expect(saves[1].body.intro).toBe('First and more');
    await answer(1, true);
    expect(backup()).toBeUndefined();
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('saves one at a time, in order', async () => {
    render(<NewsletterEditForm token="tok" initialPayload={payload} />);
    type('Hello', 'One');
    await tick(AUTOSAVE_MS);
    type('One', 'Two');
    await tick(AUTOSAVE_MS); // the second waits for the first to finish
    expect(saves).toHaveLength(1);
    await answer(0, true);
    await tick(0);
    expect(saves).toHaveLength(2);
    expect(saves[1].body.intro).toBe('Two');
  });
});
