import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleSignOut } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handleSignOut(r, liveMemberDeps));
