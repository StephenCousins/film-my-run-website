import { prisma } from '@/lib/db';
import { SOCIAL_CONFIG, switchIsOn } from './rules';

/** The admin on/off switch (/admin/social). Off when the settings row is missing. */
export async function isSocialPostingEnabled(): Promise<boolean> {
  const row = await prisma.settings.findUnique({ where: { key: SOCIAL_CONFIG.switchKey } });
  return switchIsOn(row?.value);
}

export async function setSocialPostingEnabled(enabled: boolean): Promise<void> {
  const key = SOCIAL_CONFIG.switchKey;
  await prisma.settings.upsert({ where: { key }, update: { value: enabled, updated_at: new Date() }, create: { key, value: enabled, updated_at: new Date() } });
}
