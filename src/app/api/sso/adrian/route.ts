import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// The Adrian training app is a separate app; we hand the user off to it.
const ADRIAN_APP_URL =
  process.env.NEXT_PUBLIC_ADRIAN_APP_URL ||
  'https://marathon-plan-app-production.up.railway.app';
const SSO_SECRET = process.env.SSO_SHARED_SECRET;

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

// Minimal HS256 JWT signer (avoids adding a JWT dependency; Adrian verifies
// this with python-jose using the same shared secret).
function signJwtHS256(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Seamless hand-off to the Adrian training app.
 *
 * A signed-in Film My Run member is passed straight into Adrian (found or
 * created by email) via a short-lived signed token — no second login. Anyone
 * not signed in falls back to Adrian's own signup page.
 */
export async function GET(req: NextRequest) {
  const planParam = req.nextUrl.searchParams.get('plan') || '';
  const paidPlan = planParam === 'pro' || planParam === 'premium' ? planParam : '';

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (email && SSO_SECRET) {
    let emailVerified = false;
    try {
      const dbUser = await prisma.users.findUnique({
        where: { email },
        select: { email_verified_at: true },
      });
      emailVerified = !!dbUser?.email_verified_at;
    } catch {
      // Non-fatal: proceed without the verified flag.
    }

    const now = Math.floor(Date.now() / 1000);
    const token = signJwtHS256(
      {
        email,
        name: session.user?.name || '',
        email_verified: emailVerified,
        iat: now,
        exp: now + 120, // 2-minute window limits replay
      },
      SSO_SECRET
    );

    const url = new URL(`${ADRIAN_APP_URL}/api/auth/sso`);
    url.searchParams.set('token', token);
    if (paidPlan) url.searchParams.set('plan', paidPlan);
    return NextResponse.redirect(url);
  }

  // Fallback: not signed in (or SSO not configured) → Adrian's own signup.
  const url = new URL(`${ADRIAN_APP_URL}/register`);
  if (paidPlan) url.searchParams.set('plan', paidPlan);
  return NextResponse.redirect(url);
}
