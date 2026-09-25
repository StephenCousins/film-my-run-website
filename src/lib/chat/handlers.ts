import { NextRequest, NextResponse } from 'next/server';
import { checkProHeader } from './pro';
import { isInstallId, validateNewMessage } from './validate';
import {
  CHAT_DAILY_LIMIT,
  addUserMessageIfUnderLimit,
  getThread,
  type AddUserMessageResult,
  type ChatThreadDTO,
} from './store';
import { notifyStephen as liveNotifyStephen } from './notify';
import { memberFromBearer } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

export type ChatDeps = {
  getThread: (installId: string) => Promise<ChatThreadDTO | null>;
  /** Checks the daily limit and inserts the message as one atomic unit — see store.ts. */
  addUserMessageIfUnderLimit: (
    installId: string,
    m: { name: string; email: string; text: string },
    limit: number,
    now: Date
  ) => Promise<AddUserMessageResult>;
  notifyStephen: (t: { threadId: string; name: string; email: string; text: string }) => Promise<void>;
  now?: () => number;
  debugIds?: string;
  /**
   * The signed-in member behind the request's bearer, if any. An account in
   * FMR Club (a website subscription, or Pro reported from another phone)
   * may send without this phone's StoreKit proof, as checkout already allows.
   */
  memberForRequest?: (req: Request) => Promise<{ proUntil: string | null } | null>;
};

/**
 * FMR Club: this phone's StoreKit proof (X-FMR-Pro), or a signed-in account
 * in FMR Club (bearer). Chat and race pacing (`lib/races`) both ask this.
 */
export async function isFmrClub(
  req: Request,
  installId: string,
  deps: Pick<ChatDeps, 'memberForRequest' | 'debugIds'>,
  now: number
): Promise<boolean> {
  if (checkProHeader(req.headers.get('X-FMR-Pro'), installId, { debugIds: deps.debugIds, now }).ok) return true;
  if (!deps.memberForRequest) return false;
  const member = await deps.memberForRequest(req);
  return !!member?.proUntil && Date.parse(member.proUntil) > now;
}

/** GET /api/app/v1/chat/thread — install header only, no Pro proof required (spec §3). */
export async function handleGetThread(req: NextRequest, deps: ChatDeps): Promise<Response> {
  const installId = req.headers.get('X-FMR-Install');
  if (!isInstallId(installId)) {
    return NextResponse.json({ ok: false, error: 'Missing or invalid X-FMR-Install' }, { status: 400 });
  }
  const thread = await deps.getThread(installId);
  return NextResponse.json({ ok: true, thread });
}

/** POST /api/app/v1/chat/messages — Pro proof, validation, then the daily limit. */
export async function handlePostMessage(req: NextRequest, deps: ChatDeps): Promise<Response> {
  const installId = req.headers.get('X-FMR-Install');
  if (!isInstallId(installId)) {
    return NextResponse.json({ ok: false, error: 'Missing or invalid X-FMR-Install' }, { status: 400 });
  }

  const now = deps.now ? deps.now() : Date.now();
  if (!(await isFmrClub(req, installId, deps, now))) {
    return NextResponse.json({ ok: false, error: 'FMR Club required' }, { status: 403 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const validated = validateNewMessage(body);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  const result = await deps.addUserMessageIfUnderLimit(installId, validated.value, CHAT_DAILY_LIMIT, new Date(now));
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "That's five today, Stephen will get back to you." },
      { status: 429 }
    );
  }

  const { threadId, message } = result;
  await deps.notifyStephen({ threadId, name: validated.value.name, email: validated.value.email, text: validated.value.text });
  return NextResponse.json({ ok: true, message });
}

export const liveChatDeps: ChatDeps = {
  getThread,
  addUserMessageIfUnderLimit,
  notifyStephen: liveNotifyStephen,
  memberForRequest: (req) => memberFromBearer(req, liveMemberDeps),
};
