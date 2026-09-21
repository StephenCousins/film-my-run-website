import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleVerify } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

// Member sign-in, step 2 (spec §2.1).
export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handleVerify(r, liveMemberDeps), { limit: 30 });
