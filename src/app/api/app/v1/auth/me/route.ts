import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleMe } from '@/lib/members/handlers';
import { liveMemberDeps } from '@/lib/members/store';

export const dynamic = 'force-dynamic';
export const GET = withAppApi((r) => handleMe(r, liveMemberDeps));
