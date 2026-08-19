/**
 * Battery levels from a FIT file.
 *
 * Ported from the standalone Route Overlay app. Garmin watches don't put
 * battery on the record messages, and the `device_info` battery fields are
 * INVALID in most files — the figure actually lives in message type 104
 * ("pad"), which `fit-file-parser` doesn't surface. So this walks the raw
 * binary looking for it.
 *
 * Snapshots are sparse (one every few minutes), so they're step-interpolated
 * onto the trackpoint timestamps.
 */

interface BatterySnapshot {
  time: number;
  pct: number;
}

/** Garmin counts seconds from this epoch, not the Unix one. */
const GARMIN_EPOCH = Date.UTC(1989, 11, 31);

interface FieldDef {
  fn: number;
  sz: number;
  off: number;
}

interface MessageDef {
  gm: number;
  fields: FieldDef[];
  totalSize: number;
}

/**
 * Scan the raw FIT binary for message type 104, which carries periodic
 * battery snapshots: field 2 is the percentage, field 253 the timestamp.
 */
export function extractBatteryFromRaw(arrayBuffer: ArrayBuffer): BatterySnapshot[] {
  const buf = new Uint8Array(arrayBuffer);
  if (buf.length < 14) return [];

  let offset = buf[0]; // header size
  const definitions: Record<number, MessageDef> = {};
  const snapshots: BatterySnapshot[] = [];

  while (offset < buf.length - 2) {
    const recordHeader = buf[offset];
    offset++;

    // Compressed timestamp header — skip the payload using the known definition
    if ((recordHeader & 0x80) !== 0) {
      const localType = (recordHeader >> 5) & 0x03;
      if (definitions[localType]) offset += definitions[localType].totalSize;
      continue;
    }

    const isDefinition = (recordHeader & 0x40) !== 0;
    const hasDeveloperFields = (recordHeader & 0x20) !== 0;
    const localType = recordHeader & 0x0f;

    if (isDefinition) {
      offset++; // reserved byte
      const architecture = buf[offset];
      offset++;
      const globalMessage =
        architecture === 0
          ? buf[offset] | (buf[offset + 1] << 8)
          : (buf[offset] << 8) | buf[offset + 1];
      offset += 2;

      const fieldCount = buf[offset];
      offset++;

      const fields: FieldDef[] = [];
      let totalSize = 0;
      for (let i = 0; i < fieldCount; i++) {
        const fn = buf[offset++];
        const sz = buf[offset++];
        offset++; // base type
        fields.push({ fn, sz, off: totalSize });
        totalSize += sz;
      }

      if (hasDeveloperFields) {
        const devCount = buf[offset];
        offset++;
        for (let i = 0; i < devCount; i++) {
          offset++; // field number
          totalSize += buf[offset++]; // size
          offset++; // developer data index
        }
      }

      definitions[localType] = { gm: globalMessage, fields, totalSize };
      continue;
    }

    const def = definitions[localType];
    if (!def) break; // data record with no definition — the stream is unreadable from here

    if (def.gm === 104) {
      let time: number | null = null;
      let pct: number | null = null;

      for (const f of def.fields) {
        const o = offset + f.off;
        if (f.fn === 253 && f.sz === 4) {
          const v = (buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24)) >>> 0;
          if (v !== 0xffffffff) time = GARMIN_EPOCH + v * 1000;
        } else if (f.fn === 2 && f.sz === 1) {
          const v = buf[o];
          if (v !== 0xff) pct = v;
        }
      }

      if (time !== null && pct !== null) snapshots.push({ time, pct });
    }

    offset += def.totalSize;
  }

  return snapshots;
}

/** Step-interpolate sparse snapshots onto trackpoint timestamps. */
function interpolateSnapshots(
  snapshots: BatterySnapshot[],
  timestamps: (Date | null)[]
): (number | null)[] {
  if (snapshots.length === 0) return [];
  const sorted = [...snapshots].sort((a, b) => a.time - b.time);

  return timestamps.map((ts) => {
    if (!ts) return null;
    const t = ts.getTime();
    if (t <= sorted[0].time) return sorted[0].pct;
    if (t >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].pct;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (t >= sorted[i].time) return sorted[i].pct;
    }
    return null;
  });
}

/**
 * Per-trackpoint battery levels, preferring per-record fields (a Connect IQ
 * data field will populate these) and falling back to the raw binary scan.
 * Returns an empty array when the file carries no battery data at all.
 */
export function buildBatteryLevels(
  perRecordSoc: (number | null)[],
  timestamps: (Date | null)[],
  arrayBuffer: ArrayBuffer
): (number | null)[] {
  if (perRecordSoc.some((v) => v !== null)) return perRecordSoc;

  const snapshots = extractBatteryFromRaw(arrayBuffer);
  if (snapshots.length === 0) return [];

  return interpolateSnapshots(snapshots, timestamps);
}
