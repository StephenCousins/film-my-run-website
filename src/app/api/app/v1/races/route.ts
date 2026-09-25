import { withAppApi } from '@/lib/app-api/rate-limit';
import { handleRaces, liveRacesDeps } from '@/lib/races/handlers';

// Race-day pacing's race library, from Crew Notes (lib/races/handlers.ts).
// Not force-dynamic: that turns off the fetch cache, and the day-long cache
// of the Crew Notes calls is the point. Reading the request keeps it dynamic.
export const GET = withAppApi((r) => handleRaces(r, liveRacesDeps), { limit: 60 });
