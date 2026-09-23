import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleApple } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

// Sign in with Apple from the app: the identity token for a session token.
export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handleApple(r, liveMemberDeps), { limit: 30 });
