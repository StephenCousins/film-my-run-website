'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Resend } from 'resend';
import { authOptions } from '@/lib/auth';
import { isChatAdmin } from '@/lib/chat/admin';
import { addReply } from '@/lib/chat/store';
import { buildReplyEmail } from '@/lib/chat/reply-email';

/**
 * Server action bound to a thread id ("Ask Stephen" admin inbox, spec §3).
 * Re-checks the admin gate independently of the page (belt and braces: the
 * page already 404s a non-admin before this can be reached).
 */
export async function replyToThread(threadId: string, formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!isChatAdmin(session)) {
    throw new Error('Not authorised');
  }

  const text = String(formData.get('text') ?? '').trim();
  if (!text || text.length > 5000) {
    throw new Error('Reply must be between 1 and 5000 characters');
  }

  const { email, name } = await addReply(threadId, text);

  try {
    const { subject, text: emailText, html } = buildReplyEmail({ name, text });
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>',
      to: email,
      subject,
      text: emailText,
      html,
    });
    if (error) console.error('Chat: Resend error emailing the reply', error);
  } catch (err) {
    console.error('Chat: failed to email the reply', err);
  }

  revalidatePath('/admin/inbox');
  redirect(`/admin/inbox/${threadId}`);
}
