import { completeTextWithImage } from '@/lib/llm';

export interface PhotoCheckDeps {
  completeTextWithImage: typeof completeTextWithImage;
}

/**
 * Cheap vision check before a UTMB profile picture is used as a runner page's
 * portrait: a human writer found one that was actually a dog. Same yes/no
 * call and cheap model as the shoe image verification (see
 * src/lib/shoes/images/verify.ts). A failed or unclear call is never a pass —
 * no photo beats a wrong one.
 */
export async function isPersonPhoto(
  imageUrl: string,
  deps: PhotoCheckDeps = { completeTextWithImage }
): Promise<boolean> {
  try {
    const answer = await deps.completeTextWithImage({
      imageUrl,
      maxTokens: 10,
      prompt: `Is this a real photo showing an adult person (face or body clearly visible)?

Reply NO if it is an animal, logo, cartoon, default avatar, landscape or text graphic.

Reply ONLY: YES or NO.`,
    });
    return answer.trim().toUpperCase().startsWith('YES');
  } catch {
    return false;
  }
}
