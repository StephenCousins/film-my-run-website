import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleDelete } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

// Delete my account, from the app (App Store guideline 5.1.1(v)).
export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handleDelete(r, liveMemberDeps), { limit: 10 });
