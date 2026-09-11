import { withAppApi } from '@/lib/app-api/rate-limit';
import { GET as po10GET } from '@/app/api/how-fast/po10/route';

// Versioned alias for the iPhone app (docs/app-api.md).
export const dynamic = 'force-dynamic';
export const GET = withAppApi(po10GET, { limit: 30 });
