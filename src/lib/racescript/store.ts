/**
 * Tiny in-memory TTL store for RaceScript's ephemeral data (OAuth state and the
 * assembled activity context). Runs in the single persistent Next server on
 * Railway; nothing here is meant to survive a restart, and nothing sensitive
 * (no Strava token) is ever kept — only the derived activity context, briefly.
 */

interface Entry {
  value: unknown;
  expires: number;
}

const store = new Map<string, Entry>();
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

function sweep() {
  const now = Date.now();
  for (const [k, e] of store) if (e.expires < now) store.delete(k);
}

export function putEphemeral<T>(value: T, ttlMs: number = DEFAULT_TTL_MS): string {
  sweep();
  const key = crypto.randomUUID();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return key;
}

export function getEphemeral<T>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (e.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return e.value as T;
}

export function takeEphemeral<T>(key: string): T | null {
  const v = getEphemeral<T>(key);
  if (v !== null) store.delete(key);
  return v;
}
