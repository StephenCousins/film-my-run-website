import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleListOrders, liveOrderDeps } from '@/lib/members/orders';

export const dynamic = 'force-dynamic';
export const GET = withAppApi((r) => handleListOrders(r, liveOrderDeps));
