import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { allow, parseMessages, reply } from '@/lib/assistant/chat';

export const dynamic = 'force-dynamic';

const DAILY_USD = Number(process.env.ASSISTANT_DAILY_USD || 1);
const BUSY = "Sorry, I'm not available right now. You can reach Stephen through the [contact page](https://filmmyrun.com/contact).";

export async function POST(request: Request) {
  if (process.env.ASSISTANT_ENABLED !== 'true') return NextResponse.json({ error: BUSY }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const messages = parseMessages(body);
  if (typeof messages === 'string') return NextResponse.json({ error: messages }, { status: 400 });
  const sessionId = String((body as { sessionId?: unknown }).sessionId ?? '').slice(0, 64) || 'none';

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!allow(ip)) {
    return NextResponse.json({ error: "You've sent a lot of messages. Please try again a bit later." }, { status: 429 });
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const spent = await prisma.assistant_messages.aggregate({ _sum: { cost_usd: true }, where: { source: 'site', created_at: { gte: since } } });
  if ((spent._sum.cost_usd ?? 0) >= DAILY_USD) return NextResponse.json({ error: BUSY }, { status: 503 });

  const question = messages[messages.length - 1].content;
  try {
    const { text, costUsd } = await reply(messages);
    if (!text) throw new Error('empty reply');
    await prisma.assistant_messages.createMany({
      data: [
        { session_id: sessionId, role: 'user', text: question, source: 'site' },
        { session_id: sessionId, role: 'assistant', text, cost_usd: costUsd, source: 'site' },
      ],
    });
    return NextResponse.json({ reply: text });
  } catch (e) {
    console.error('assistant failed:', (e as Error).message);
    await prisma.assistant_messages.create({ data: { session_id: sessionId, role: 'user', text: question, source: 'site' } }).catch(() => {});
    return NextResponse.json({ error: BUSY }, { status: 502 });
  }
}
