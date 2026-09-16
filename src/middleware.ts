import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isChatAdmin } from '@/lib/chat/admin';

// Routes that require authentication (FREE tier or higher)
// Note: /tools/route-comparison has its own client-side auth check
// so we don't need to protect it at the middleware level
const protectedRoutes = [
  '/training/dashboard',
  '/training/plans',
  '/account',
];

// Routes that require PREMIUM tier or higher
const premiumRoutes = [
  '/training/ai-coaching',
];

// Routes that require PRO tier
const proRoutes = [
  '/training/personal-coaching',
];

// Stephen's Ask Stephen inbox (spec §3, "Admin inbox"). The pages call
// notFound() themselves, but the root loading.tsx streams a 200 shell before
// a page body runs, so the real 404 for anyone else has to be decided here.
const chatAdminRoutes = ['/admin/inbox'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (chatAdminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    let email: string | null | undefined;
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      email = token?.email;
    } catch {
      email = null;
    }
    if (!isChatAdmin({ user: { email } })) {
      // A path that does not exist renders not-found.tsx with a 404 status.
      return NextResponse.rewrite(new URL('/404', request.url));
    }
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some(
    (route) => pathname.startsWith(route)
  );
  const isPremium = premiumRoutes.some(
    (route) => pathname.startsWith(route)
  );
  const isPro = proRoutes.some(
    (route) => pathname.startsWith(route)
  );

  if (!isProtected && !isPremium && !isPro) {
    return NextResponse.next();
  }

  // Get session token
  let token;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    // JWT verification failed — treat as unauthenticated
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check tier requirements
  const userTier = typeof token.accessTier === 'string' ? token.accessTier : 'FREE';
  const tierHierarchy: Record<string, number> = {
    FREE: 1,
    PREMIUM: 2,
    PRO: 3,
  };

  const userTierLevel = tierHierarchy[userTier] || 0;

  if (isPro && userTierLevel < tierHierarchy.PRO) {
    return NextResponse.redirect(new URL('/training?upgrade=pro', request.url));
  }

  if (isPremium && userTierLevel < tierHierarchy.PREMIUM) {
    return NextResponse.redirect(new URL('/training?upgrade=premium', request.url));
  }

  // User is authenticated and has required tier
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/training/:path*',
    '/account/:path*',
    '/admin/inbox/:path*',
    '/admin/inbox',
  ],
};
