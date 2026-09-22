import { withAppApi } from '@/lib/app-api/rate-limit';
import { handlePro } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

// The app reports its StoreKit Pro to the signed-in account, so the website sees it too.
export const dynamic = 'force-dynamic';
export const POST = withAppApi((r) => handlePro(r, liveMemberDeps), { limit: 30 });
