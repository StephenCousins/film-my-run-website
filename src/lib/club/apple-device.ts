/**
 * iPhone and iPad visitors don't get the Stripe join for FMR Club. The app opens filmmyrun.com in an
 * in-app browser (news, shop checkout), and that browser looks exactly like Safari, so the only way to
 * keep a non-Apple purchase of a digital subscription out of the app (App Review 3.1.1) is to not offer
 * it on Apple's phones and tablets at all. They join in the app instead, through Apple.
 *
 * iPadOS asks for desktop pages with a Mac user agent; the touch-point check catches it in the browser.
 * On the server only the user agent is known, so an iPad in desktop mode gets through there.
 */
export function isAppleMobile(userAgent: string | null | undefined, maxTouchPoints = 0): boolean {
  if (!userAgent) return false;
  if (/\b(iPhone|iPad|iPod)\b/.test(userAgent)) return true;
  return /\bMacintosh\b/.test(userAgent) && maxTouchPoints > 1;
}

export const JOIN_IN_THE_APP = 'On iPhone and iPad, FMR Club is in the Film My Run app.';
