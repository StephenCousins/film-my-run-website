import type { ChatSender } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { NewMessage } from './validate';

/** Server-side limit on user messages per install per UTC day (spec §3). */
export const CHAT_DAILY_LIMIT = 5;

export type ChatMessageDTO = { id: string; from: 'user' | 'stephen'; text: string; createdAt: string };
export type ChatThreadDTO = { id: string; messages: ChatMessageDTO[] };

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toDTO(m: { id: string; sender: ChatSender; text: string; created_at: Date }): ChatMessageDTO {
  return { id: m.id, from: m.sender, text: m.text, createdAt: m.created_at.toISOString() };
}

export async function getThread(installId: string): Promise<ChatThreadDTO | null> {
  const thread = await prisma.chat_threads.findUnique({
    where: { install_id: installId },
    include: { messages: { orderBy: { created_at: 'asc' } } },
  });
  if (!thread) return null;
  return { id: thread.id, messages: thread.messages.map(toDTO) };
}

export type AddUserMessageResult =
  | { ok: true; threadId: string; message: ChatMessageDTO }
  | { ok: false; reason: 'limit' };

/**
 * Checks the daily limit and inserts the message as one atomic unit — the
 * two-step "count, then insert" version (a separate count query, then the
 * insert) let two concurrent requests near the limit both
 * pass, because neither request's count reflected the other's in-flight
 * insert. Locking the thread row with `FOR UPDATE` inside the transaction
 * serialises concurrent requests for the same install, so the count taken
 * just before the insert is always up to date.
 */
export async function addUserMessageIfUnderLimit(
  installId: string,
  m: NewMessage,
  limit: number = CHAT_DAILY_LIMIT,
  now: Date = new Date()
): Promise<AddUserMessageResult> {
  return prisma.$transaction(async (tx) => {
    const thread = await tx.chat_threads.upsert({
      where: { install_id: installId },
      create: { install_id: installId, name: m.name, email: m.email },
      update: {},
    });

    // Serialises concurrent transactions for this thread until this one commits,
    // so the count below can't miss a message another request is mid-insert on.
    await tx.$queryRaw`SELECT id FROM chat_threads WHERE id = ${thread.id} FOR UPDATE`;

    const todayCount = await tx.chat_messages.count({
      where: { thread_id: thread.id, sender: 'user', created_at: { gte: startOfUtcDay(now) } },
    });
    if (todayCount >= limit) return { ok: false, reason: 'limit' };

    await tx.chat_threads.update({
      where: { id: thread.id },
      data: { name: m.name, email: m.email, last_user_message_at: now, unanswered: true },
    });
    const message = await tx.chat_messages.create({
      data: { thread_id: thread.id, sender: 'user', text: m.text },
    });
    return { ok: true, threadId: thread.id, message: toDTO(message) };
  });
}

export async function addReply(threadId: string, text: string): Promise<{ message: ChatMessageDTO; email: string; name: string }> {
  const now = new Date();
  const [message, thread] = await prisma.$transaction([
    prisma.chat_messages.create({ data: { thread_id: threadId, sender: 'stephen', text } }),
    prisma.chat_threads.update({ where: { id: threadId }, data: { last_reply_at: now, unanswered: false } }),
  ]);
  return { message: toDTO(message), email: thread.email, name: thread.name };
}

export async function listThreads(): Promise<Array<{ id: string; name: string; email: string; unanswered: boolean; updatedAt: string; preview: string }>> {
  const threads = await prisma.chat_threads.findMany({
    orderBy: [{ unanswered: 'desc' }, { updated_at: 'desc' }],
    include: { messages: { orderBy: { created_at: 'desc' }, take: 1 } },
  });
  return threads.map(t => ({
    id: t.id,
    name: t.name,
    email: t.email,
    unanswered: t.unanswered,
    updatedAt: t.updated_at.toISOString(),
    preview: (t.messages[0]?.text ?? '').slice(0, 120),
  }));
}

export async function getThreadById(id: string): Promise<(ChatThreadDTO & { name: string; email: string; installId: string }) | null> {
  const thread = await prisma.chat_threads.findUnique({
    where: { id },
    include: { messages: { orderBy: { created_at: 'asc' } } },
  });
  if (!thread) return null;
  return { id: thread.id, name: thread.name, email: thread.email, installId: thread.install_id, messages: thread.messages.map(toDTO) };
}
