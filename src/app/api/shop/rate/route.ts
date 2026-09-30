/** GET → { rate }: the member discount this visitor's checkout will get (0, 0.10 or 0.15). */
import { NextResponse } from 'next/server';
import { memberPricing } from '@/lib/shop/member-pricing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { rate } = await memberPricing(request);
    return NextResponse.json({ rate }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    // No answer is better than a wrong one: pages then show list prices only.
    return NextResponse.json({ rate: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
