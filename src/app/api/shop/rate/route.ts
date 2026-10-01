/**
 * GET → { rate, ownTypeOff }: the member discount this visitor's checkout will get (0, 0.10 or
 * 0.15), and whether it will take £3 off one tee of their own type (signed in, not used yet).
 */
import { NextResponse } from 'next/server';
import { memberPricing } from '@/lib/shop/member-pricing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { rate, ownTypeOff } = await memberPricing(request);
    return NextResponse.json({ rate, ownTypeOff }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    // No answer is better than a wrong one: pages then show list prices only.
    return NextResponse.json({ rate: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
