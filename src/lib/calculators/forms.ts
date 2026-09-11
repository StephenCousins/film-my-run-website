/**
 * Shared shape of the hours/minutes/seconds fields the calculator forms hold.
 */
export interface TimeFields {
  hours: string;
  minutes: string;
  seconds: string;
}

/**
 * `parseInt(field) || 0` for each part, exactly as the components did.
 * Empty and non-numeric fields count as 0.
 */
export function secondsFromFields(t: TimeFields): number {
  return (
    (parseInt(t.hours) || 0) * 3600 + (parseInt(t.minutes) || 0) * 60 + (parseInt(t.seconds) || 0)
  );
}
