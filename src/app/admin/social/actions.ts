'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isChatAdmin } from '@/lib/chat/admin';
import { setSocialPostingEnabled } from '@/lib/social/settings';

/** The social posting on/off switch. Re-checks the admin gate: a server action is a public endpoint. */
export async function setSocialPosting(enabled: boolean): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!isChatAdmin(session)) throw new Error('Not authorised');
  await setSocialPostingEnabled(enabled);
  revalidatePath('/admin/social');
}
