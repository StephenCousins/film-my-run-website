import { withAppApi } from '@/lib/app-api/rate-limit';
import { POST as po10Refresh } from '@/app/api/how-fast/po10/refresh/route';

// Versioned alias for the iPhone app (docs/app-api.md).
export const dynamic = 'force-dynamic';
export const POST = withAppApi(po10Refresh, { limit: 6 });
