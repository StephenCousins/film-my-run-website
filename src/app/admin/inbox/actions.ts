'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isChatAdmin } from '@/lib/chat/admin';
import { setStephenBusy } from '@/lib/chat/store';

/** The inbox's "I'm busy" switch. Re-checks the admin gate, as replyToThread does. */
export async function setBusy(busy: boolean): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!isChatAdmin(session)) throw new Error('Not authorised');
  await setStephenBusy(busy);
  revalidatePath('/admin/inbox');
}
