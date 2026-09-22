/**
 * "Arrives Mon 5 Oct – Wed 14 Oct". A date beats "2 to 5 working days": the
 * runner can tell whether it lands before their race. Same rule as the iOS
 * app's ShopFormatting, so the two never disagree: production then post, both
 * counted in working days.
 */
export const PRODUCTION_DAYS = [2, 5] as const;
export const POST_DAYS = [3, 7] as const;

export function addWorkingDays(days: number, from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return d;
}

export function deliveryWindow(from = new Date()): { earliest: Date; latest: Date } {
  return {
    earliest: addWorkingDays(PRODUCTION_DAYS[0] + POST_DAYS[0], from),
    latest: addWorkingDays(PRODUCTION_DAYS[1] + POST_DAYS[1], from),
  };
}

const short = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
/** Node's en-GB writes "Sept"; the app writes "Sep", and the two must read alike. */
const day = (d: Date) => short.format(d).replace('Sept', 'Sep');

export function arrives(from = new Date()): string {
  const { earliest, latest } = deliveryWindow(from);
  return `Arrives ${day(earliest)} – ${day(latest)}`;
}
