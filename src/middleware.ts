import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that require authentication (FREE tier or higher)
const protectedRoutes = [
  '/tools/route-comparison',
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check tier requirements
  const userTier = token.accessTier as string;
  const tierHierarchy: Record<string, number> = {
    FREE: 1,
    PREMIUM: 2,
    PRO: 3,
  };

  const userTierLevel = tierHierarchy[userTier] || 0;

  if (isPro && userTierLevel < tierHierarchy.PRO) {
    // Redirect to upgrade page
    return NextResponse.redirect(new URL('/pricing?upgrade=pro', request.url));
  }

  if (isPremium && userTierLevel < tierHierarchy.PREMIUM) {
    // Redirect to upgrade page
    return NextResponse.redirect(new URL('/pricing?upgrade=premium', request.url));
  }

  // User is authenticated and has required tier
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/tools/route-comparison/:path*',
    '/training/:path*',
    '/account/:path*',
  ],
};
