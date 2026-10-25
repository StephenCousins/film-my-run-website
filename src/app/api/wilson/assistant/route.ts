import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { allow, parseMessages } from '@/lib/assistant/chat';
import { isInstallId, parseContext, WILSON_LIMITS, wilsonReply } from '@/lib/wilson-assistant/chat';

export const dynamic = 'force-dynamic';

const DAILY_USD = Number(process.env.WILSON_ASSISTANT_DAILY_USD || 1);
const BUSY = "Sorry, I can't answer right now. Have a look at the written answers instead.";

export async function POST(request: Request) {
  if (process.env.WILSON_ASSISTANT_ENABLED !== 'true') return NextResponse.json({ error: BUSY }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const messages = parseMessages(body);
  if (typeof messages === 'string') return NextResponse.json({ error: messages }, { status: 400 });
  const context = parseContext(body);
  if (typeof context !== 'string') return NextResponse.json({ error: context.error }, { status: 400 });
  const { sessionId: rawSession, installId } = body as { sessionId?: unknown; installId?: unknown };
  const sessionId = String(rawSession ?? '').slice(0, 64) || 'none';

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  const ok = isInstallId(installId)
    ? allow(`wilson:${installId.toLowerCase()}`, Date.now(), WILSON_LIMITS.install)
    : allow(`wilson-ip:${ip}`, Date.now(), WILSON_LIMITS.ip);
  if (!ok) return NextResponse.json({ error: "You've sent a lot of messages. Please try again a bit later." }, { status: 429 });

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const spent = await prisma.assistant_messages.aggregate({ _sum: { cost_usd: true }, where: { source: 'wilson', created_at: { gte: since } } });
  if ((spent._sum.cost_usd ?? 0) >= DAILY_USD) return NextResponse.json({ error: BUSY }, { status: 503 });

  const question = messages[messages.length - 1].content;
  try {
    const { text, costUsd } = await wilsonReply(messages, context);
    if (!text) throw new Error('empty reply');
    await prisma.assistant_messages.createMany({
      data: [
        { session_id: sessionId, role: 'user', text: question, source: 'wilson' },
        { session_id: sessionId, role: 'assistant', text, cost_usd: costUsd, source: 'wilson' },
      ],
    });
    return NextResponse.json({ reply: text });
  } catch (e) {
    console.error('wilson assistant failed:', (e as Error).message);
    await prisma.assistant_messages.create({ data: { session_id: sessionId, role: 'user', text: question, source: 'wilson' } }).catch(() => {});
    return NextResponse.json({ error: BUSY }, { status: 502 });
  }
}
