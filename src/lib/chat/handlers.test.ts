import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleGetThread, handlePostMessage, type ChatDeps } from './handlers';
import { encodeTestJws } from './pro';
import type { ChatMessageDTO, ChatThreadDTO } from './store';

const NOW = Date.UTC(2026, 8, 16);
const proPayload = { bundleId: 'com.filmmyrun.app', productId: 'com.filmmyrun.app.pro.annual', expiresDate: NOW + 86_400_000 };
const PRO_HEADER = encodeTestJws(proPayload);

const INSTALL_A = '11111111-1111-4111-8111-111111111111';
const INSTALL_B = '22222222-2222-4222-8222-222222222222';

/** In-memory fake of the four store functions, isolated per install id. */
function fakeStore() {
  const byInstall = new Map<string, { threadId: string; messages: ChatMessageDTO[] }>();
  let idCounter = 0;

  const getThread: ChatDeps['getThread'] = async (installId) => {
    const t = byInstall.get(installId);
    return t ? { id: t.threadId, messages: t.messages } : null;
  };

  const countUserMessagesToday: ChatDeps['countUserMessagesToday'] = async (installId) => {
    const t = byInstall.get(installId);
    return t ? t.messages.filter((m) => m.from === 'user').length : 0;
  };

  const addUserMessage: ChatDeps['addUserMessage'] = async (installId, m) => {
    let t = byInstall.get(installId);
    if (!t) {
      t = { threadId: `thread-${installId}`, messages: [] };
      byInstall.set(installId, t);
    }
    const message: ChatMessageDTO = { id: `m${++idCounter}`, from: 'user', text: m.text, createdAt: new Date(NOW).toISOString() };
    t.messages.push(message);
    return { threadId: t.threadId, message };
  };

  return { getThread, countUserMessagesToday, addUserMessage };
}

function makeDeps(): { deps: ChatDeps; notifyStephen: ReturnType<typeof vi.fn> } {
  const notifyStephen = vi.fn(async () => {});
  const store = fakeStore();
  return {
    deps: { ...store, notifyStephen, now: () => NOW },
    notifyStephen,
  };
}

function postReq(body: unknown, headers: Record<string, string>) {
  return new NextRequest('http://x/api/app/v1/chat/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function getReq(headers: Record<string, string>) {
  return new NextRequest('http://x/api/app/v1/chat/thread', { headers });
}

describe('handleGetThread', () => {
  it('400s without the install header', async () => {
    const { deps } = makeDeps();
    const res = await handleGetThread(getReq({}), deps);
    expect(res.status).toBe(400);
  });

  it('returns thread: null for an unknown install', async () => {
    const { deps } = makeDeps();
    const res = await handleGetThread(getReq({ 'X-FMR-Install': INSTALL_A }), deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, thread: null });
  });

  it('never lets install A see install B messages', async () => {
    const { deps } = makeDeps();
    await handlePostMessage(
      postReq({ name: 'A', email: 'a@example.com', text: 'from A' }, { 'X-FMR-Install': INSTALL_A, 'X-FMR-Pro': PRO_HEADER, 'content-type': 'application/json' }),
      deps
    );
    await handlePostMessage(
      postReq({ name: 'B', email: 'b@example.com', text: 'from B' }, { 'X-FMR-Install': INSTALL_B, 'X-FMR-Pro': PRO_HEADER, 'content-type': 'application/json' }),
      deps
    );
    const res = await handleGetThread(getReq({ 'X-FMR-Install': INSTALL_A }), deps);
    const body = (await res.json()) as { ok: true; thread: ChatThreadDTO };
    const texts = body.thread.messages.map((m) => m.text);
    expect(texts).toContain('from A');
    expect(texts).not.toContain('from B');
  });
});

describe('handlePostMessage', () => {
  let deps: ChatDeps;
  let notifyStephen: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    ({ deps, notifyStephen } = makeDeps());
  });

  it('403s without Pro, and never notifies', async () => {
    const res = await handlePostMessage(
      postReq({ name: 'A', email: 'a@example.com', text: 'hi' }, { 'X-FMR-Install': INSTALL_A, 'content-type': 'application/json' }),
      deps
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: 'Pro required' });
    expect(notifyStephen).not.toHaveBeenCalled();
  });

  it('stores the message and notifies Stephen once, for a Pro request', async () => {
    const res = await handlePostMessage(
      postReq(
        { name: 'Jo', email: 'jo@example.com', text: 'How do I fuel a 100?' },
        { 'X-FMR-Install': INSTALL_A, 'X-FMR-Pro': PRO_HEADER, 'content-type': 'application/json' }
      ),
      deps
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: true; message: ChatMessageDTO };
    expect(body.ok).toBe(true);
    expect(body.message.text).toBe('How do I fuel a 100?');
    expect(body.message.from).toBe('user');
    expect(notifyStephen).toHaveBeenCalledTimes(1);
    expect(notifyStephen).toHaveBeenCalledWith({
      threadId: `thread-${INSTALL_A}`,
      name: 'Jo',
      email: 'jo@example.com',
      text: 'How do I fuel a 100?',
    });
  });

  it('400s a bad email with the validate message', async () => {
    const res = await handlePostMessage(
      postReq(
        { name: 'Jo', email: 'nope', text: 'hi' },
        { 'X-FMR-Install': INSTALL_A, 'X-FMR-Pro': PRO_HEADER, 'content-type': 'application/json' }
      ),
      deps
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'Please give a valid email address.' });
    expect(notifyStephen).not.toHaveBeenCalled();
  });

  it('429s the sixth message in a UTC day with the exact text', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await handlePostMessage(
        postReq(
          { name: 'Jo', email: 'jo@example.com', text: `message ${i}` },
          { 'X-FMR-Install': INSTALL_A, 'X-FMR-Pro': PRO_HEADER, 'content-type': 'application/json' }
        ),
        deps
      );
      expect(res.status).toBe(200);
    }
    const sixth = await handlePostMessage(
      postReq(
        { name: 'Jo', email: 'jo@example.com', text: 'message 5' },
        { 'X-FMR-Install': INSTALL_A, 'X-FMR-Pro': PRO_HEADER, 'content-type': 'application/json' }
      ),
      deps
    );
    expect(sixth.status).toBe(429);
    expect(await sixth.json()).toEqual({ ok: false, error: "That's five today, Stephen will get back to you." });
    expect(notifyStephen).toHaveBeenCalledTimes(5);
  });
});
