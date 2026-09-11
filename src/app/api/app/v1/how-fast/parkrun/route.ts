import { withAppApi } from '@/lib/app-api/rate-limit';
import { GET as parkrunGET } from '@/app/api/how-fast/parkrun/route';

// Versioned alias for the iPhone app (docs/app-api.md). Same handler as
// /api/how-fast/parkrun; only rate limiting and headers are added.
export const dynamic = 'force-dynamic';
export const GET = withAppApi(parkrunGET, { limit: 30 });
