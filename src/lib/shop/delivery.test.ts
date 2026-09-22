import { describe, it, expect } from 'vitest';
import { addWorkingDays, deliveryWindow, arrives } from './delivery';

describe('delivery dates', () => {
  it('counts working days, skipping weekends', () => {
    const fri = new Date(2026, 8, 25); // Friday 25 Sep 2026
    expect(addWorkingDays(1, fri).getDate()).toBe(28); // Monday
    expect(addWorkingDays(5, fri).getDate()).toBe(2); // the following Friday
    expect(addWorkingDays(0, fri).getDate()).toBe(25);
  });

  it('is production + post, earliest and latest', () => {
    const mon = new Date(2026, 8, 21);
    const { earliest, latest } = deliveryWindow(mon);
    expect(earliest.getTime()).toBeLessThan(latest.getTime());
    // 5 working days out, and 12.
    expect(earliest.getDate()).toBe(28);
    expect(latest.getDate()).toBe(7);
  });

  it('reads as a date range', () => {
    expect(arrives(new Date(2026, 8, 21))).toBe('Arrives Mon 28 Sep – Wed 7 Oct');
  });
});
