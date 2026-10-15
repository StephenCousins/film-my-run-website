# Route Comparison

Moved from CLAUDE.md on 15 Oct 2026.

**Page:** `/tools/route-comparison`: upload N GPX or FIT files and compare them.
Gated behind `hasAccess('FREE')`, which still requires an authenticated session,
so signed-out visitors see nothing but the `LoginPrompt`.

Six tabs: Overview (stats + full-width map), Charts, Splits, Time Gaps,
Segments, Insights.

## Map
The Overview map is **Google Maps** (`@react-google-maps/api`), sharing the
race map's loader id and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. It was Leaflet on
Carto's free basemap until Sep 2026, when Carto started watermarking those
tiles "API KEY REQUIRED". `parkrun/VenueMapClient.tsx` moved to Google Maps
for the same reason.

## Library layout (`src/lib/route-comparison/`)
| File | Holds |
|---|---|
| `types.ts` | `RouteData`: the per-point series and stats |
| `file-parser.ts` | GPX (DOMParser) and FIT (`fit-file-parser`) |
| `fit-battery.ts` | Raw binary scan for battery (see below) |
| `analysis.ts` | Splits, best efforts, zones, time gaps, grades, steep sections, effort score |
| `stats.ts` / `gps.ts` | Distance, elevation stats, smoothing, GPS cleaning, device distance channel |
| `axis.ts` | Chart Y-axis scaling |
| `persistence.ts` | localStorage save/restore |

## Metrics parsed
Always: elevation, speed, pace, heart rate, cadence, power.
From FIT where present: **temperature, battery, GPS accuracy, GPS altitude**.
These four are optional on `RouteData` and attached **only when the file
actually carried a value**: an all-null array would light up a chart option
with nothing behind it. `availableMetrics()` drives which metric buttons show.

- **Battery** is not on the FIT record messages, and the `device_info` fields
  are INVALID on most Garmins. `fit-battery.ts` walks the raw binary for
  message type 104 ("pad"): field 2 is the percentage, field 253 the timestamp
  (Garmin epoch, 31 Dec 1989). Snapshots are sparse and step-interpolated onto
  trackpoint timestamps.
- **Dual elevation**: `enhanced_altitude` is barometric and goes to
  `elevations`; plain `altitude` is GPS-derived and goes to `gpsElevations`,
  kept only when it differs by >0.1m on at least 10% of points. Without a
  barometer the two are identical and the overlay would draw the same line twice.
- **Temperature is the one metric where 0 and below are real readings.** Every
  other metric treats 0 as "no data" and filters it out; temperature has to opt
  out of that or sub-zero readings vanish from the smoothing average.

## Chart axes (`axis.ts`)
`niceAxisBounds()` rounds Y bounds out to whole multiples of a nice step, so a
103–178bpm trace labels 100/120/140/160/180 rather than 103/118/133. Per-metric
rules live in `AXIS_OPTIONS`: speed, power, cadence and GPS error snap to zero;
heart rate, pace and temperature do not (zero is meaningless and squashes the
useful range); battery caps at 100 and prefers it as the top. Pace and time-gap
axes use second-based step ladders.

## Distance and duration
`stats.distance` comes from **the device, not the GPS track**. A Haversine sum
over the track is the worst distance available for a FIT file: it accumulates
positional jitter as real distance, and records with no lat/lng are dropped at
parse time, so a lost-fix stretch gets chorded straight across. Measured over
18 real Garmin files the track over-reads by up to **3.97%: 4.1 km on a 103 km
ultra**.

Precedence is `session.total_distance` → the `record.distance` odometer →
Haversine, recorded in `stats.distanceSource`. Duration follows the same shape
from `total_elapsed_time`, and `stats.movingTime` carries `total_timer_time`.
`stats.gpsDistance`/`gpsDuration` keep the purely track-derived figures, because
anything measuring the device against the track needs both.

**Ascent and descent stay recomputed on purpose.** Device ascent is barometric
and calibrated per-device, so comparing two watches on their own numbers
compares their barometers rather than the route.

Two guards matter:
- `isUsableDistanceChannel()` rejects a per-point channel that has holes, goes
  backwards, or doesn't match the track length. `findIndexAtDistance` binary-
  searches this array, so a single null or backward step *corrupts a search*
  rather than merely looking wrong. **4 of 18 real Garmin files have a
  non-monotonic odometer**: this is not a theoretical case. Such files keep
  the session total as the headline and fall back to Haversine for plotting.
- If the odometer and the session total disagree by more than 25%, the channel
  is dropped, as insurance against the parser's units shifting underneath us.

Everything that slices by distance (splits, best efforts, segments, time gaps)
goes through `buildCumulativeDistances(coords, route.distances)` so it agrees
with the headline number. `calculateSplitPace` measures over that same array:
pricing a 1 device-km split over the Haversine length of those points reported
a pace several percent faster than the watch did.

## Zones
`calculateZones` uses **the device's own zone boundaries** when the file carries
them, via `buildHrZoneBoundaries()`: `time_in_zone` high boundaries first, then
explicit `hr_zone` messages, then computed from `zones_target` + `user_profile`
(percent-of-HRR where the device works that way, else percent of max).

Anchoring to the activity's observed maximum (the previous behaviour, kept as
the fallback for GPX and any file without zone data) makes every easy run look
hard. On a 103 km easy ultra whose HR never passed 152 against a true max of
178, it reported **15.9% at Threshold and 3.3% at Maximum for a run the device
scored 0% and 0%**.

## Persistence
Routes are saved to localStorage (`fmr:route-comparison:v1`) and restored after
mount, so a refresh doesn't discard loaded files. Timestamps need reviving:
JSON turns Dates into strings. Payloads over ~3.5MB are skipped rather than
risking `QuotaExceededError`, and blocked storage (private browsing) is handled
silently. "Clear All" clears storage too.

## Not ported from the standalone app
The standalone Route Overlay app (`~/Developer/route-comparison`) also has a
hardware-tester suite (cross-track deviation, auto-align, distance drift,
session self-check, HR/cadence validation, dropout diagnostics, fault report)
plus photos, ZIP export, playback animation and Firebase sessions. **That suite
is deliberately not here**: it exists to file Garmin firmware bugs, not to serve
runners. Auto-align is the one piece worth porting eventually.

The FIT parser now also reads `data.sessions`, `zones_target`, `user_profile`
and `time_in_zone` (see "Distance and duration" and "Zones" above), so
device-reported totals *are* available. The session self-check itself is still
not ported, but `stats.gpsDistance`/`gpsDuration` exist so it could be.

**`fit-file-parser` is pinned at 2.2.5 here and 4.1.0 in the standalone.** That
is deliberate, not drift: verified against real files, 2.2.5 returns identical
`total_distance`, `total_elapsed_time`, `total_timer_time` and odometer values,
and already exposes `zones_target`/`user_profile`. Upgrading buys nothing these
features need.
