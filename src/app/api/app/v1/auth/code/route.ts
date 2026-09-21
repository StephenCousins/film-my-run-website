import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleRequestCode } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

// Member sign-in, step 1 (spec §2.1). Per-email limit is inside the handler.
export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handleRequestCode(r, liveMemberDeps), { limit: 20 });
