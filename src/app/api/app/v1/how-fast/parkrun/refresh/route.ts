import { withAppApi } from '@/lib/app-api/rate-limit';
import { POST as parkrunRefresh } from '@/app/api/how-fast/parkrun/refresh/route';

// Versioned alias for the iPhone app (docs/app-api.md). Refreshes scrape
// parkrun, so the limit is tight.
export const dynamic = 'force-dynamic';
export const POST = withAppApi(parkrunRefresh, { limit: 6 });
