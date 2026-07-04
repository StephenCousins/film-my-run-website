/**
 * Historical race-day weather from Open-Meteo (free, no API key).
 *
 * Given the activity's start coordinates and local start time, returns the
 * conditions for that hour. Uses the forecast endpoint for the last ~90 days
 * (fresher) and the archive endpoint for older races.
 */

export interface RaceWeather {
  tempC: number | null;
  feelsLikeC: number | null;
  windKph: number | null;
  precipMm: number | null;
  humidity: number | null;
  description: string;
}

// WMO weather interpretation codes → human text.
function weatherText(code: number | null): string {
  if (code == null) return 'unknown conditions';
  if (code === 0) return 'clear skies';
  if (code <= 2) return 'mostly clear';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'foggy';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain showers';
  if (code >= 85 && code <= 86) return 'snow showers';
  if (code >= 95) return 'thunderstorms';
  return 'mixed conditions';
}

/**
 * @param lat activity start latitude
 * @param lng activity start longitude
 * @param startLocalIso local start time, ISO (e.g. "2026-05-02T08:30:00")
 */
export async function getRaceWeather(
  lat: number,
  lng: number,
  startLocalIso: string
): Promise<RaceWeather | null> {
  const date = startLocalIso.slice(0, 10); // YYYY-MM-DD
  const hour = parseInt(startLocalIso.slice(11, 13) || '12', 10);

  const ageDays = (Date.now() - new Date(date).getTime()) / 86_400_000;
  const base =
    ageDays <= 90
      ? 'https://api.open-meteo.com/v1/forecast'
      : 'https://archive-api.open-meteo.com/v1/archive';

  const url =
    `${base}?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code` +
    `&wind_speed_unit=kmh&timezone=auto`;

  try {
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const h = (await res.json()).hourly;
    if (!h?.time?.length) return null;

    // Pick the index closest to the activity's start hour.
    let idx = h.time.findIndex((t: string) => parseInt(t.slice(11, 13), 10) === hour);
    if (idx < 0) idx = Math.min(hour, h.time.length - 1);

    const at = <T,>(arr: T[] | undefined): T | null => (arr ? arr[idx] ?? null : null);
    return {
      tempC: at<number>(h.temperature_2m),
      feelsLikeC: at<number>(h.apparent_temperature),
      windKph: at<number>(h.wind_speed_10m),
      precipMm: at<number>(h.precipitation),
      humidity: at<number>(h.relative_humidity_2m),
      description: weatherText(at<number>(h.weather_code)),
    };
  } catch {
    return null;
  }
}
