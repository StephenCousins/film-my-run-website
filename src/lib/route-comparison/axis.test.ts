import { describe, it, expect } from 'vitest';
import { niceStep, niceAxisBounds, PACE_STEPS, BATTERY_STEPS } from './axis';

// Mirrors ChartManager.AXIS_OPTIONS.battery
const BATTERY = {
    preferMax: 100,
    stepLadder: BATTERY_STEPS,
    allowNegative: false,
    clampMax: 100
};

describe('Axis Scaling', () => {
    describe('niceStep', () => {
        it('should round up to 1, 2, 2.5, 5 or 10 times a power of ten', () => {
            expect(niceStep(0.9)).toBe(1);
            expect(niceStep(1.5)).toBe(2);
            expect(niceStep(2.2)).toBe(2.5);
            expect(niceStep(3)).toBe(5);
            expect(niceStep(6)).toBe(10);
        });

        it('should scale across magnitudes', () => {
            expect(niceStep(15)).toBe(20);
            expect(niceStep(120)).toBe(200);
            expect(niceStep(0.015)).toBe(0.02);
        });

        it('should fall back to 1 for junk input', () => {
            expect(niceStep(0)).toBe(1);
            expect(niceStep(-5)).toBe(1);
            expect(niceStep(NaN)).toBe(1);
            expect(niceStep(Infinity)).toBe(1);
        });

        it('should use a supplied ladder', () => {
            expect(niceStep(0.06, PACE_STEPS)).toBe(5 / 60);
            expect(niceStep(0.3, PACE_STEPS)).toBe(30 / 60);
        });
    });

    describe('niceAxisBounds', () => {
        it('should give a heavily drained battery the full 0-100% scale', () => {
            const axis = niceAxisBounds(7, 94, BATTERY);
            expect(axis.min).toBe(0);
            expect(axis.max).toBe(100);
            expect(axis.ticks).toEqual([0, 20, 40, 60, 80, 100]);
        });

        it('should keep a tight axis when the battery barely drained', () => {
            // A short run shouldn't be flattened against the top of a
            // full-scale chart, but the bounds still want to be round.
            const axis = niceAxisBounds(88, 100, BATTERY);
            expect(axis.min).toBe(85);
            expect(axis.max).toBe(100);
            expect(axis.ticks).toEqual([85, 90, 95, 100]);
        });

        it('should round battery bounds out to round percentages', () => {
            const axis = niceAxisBounds(46, 98, BATTERY);
            expect(axis.min).toBe(40);
            expect(axis.max).toBe(100);
            axis.ticks.forEach(t => expect(Number.isInteger(t)).toBe(true));
        });

        it('should never take the battery axis above 100% or below 0%', () => {
            [[3, 99], [88, 100], [46, 98], [1, 2], [0, 100]].forEach(([lo, hi]) => {
                const axis = niceAxisBounds(lo, hi, BATTERY);
                expect(axis.max).toBeLessThanOrEqual(100);
                expect(axis.min).toBeGreaterThanOrEqual(0);
                // and must still contain the data
                expect(axis.min).toBeLessThanOrEqual(lo);
                expect(axis.max).toBeGreaterThanOrEqual(hi);
            });
        });

        it('should top a nearly-full battery axis at 100, not 98', () => {
            const axis = niceAxisBounds(88, 97, BATTERY);
            expect(axis.max).toBe(100);
        });

        it('should not drag the top up to 100 when the battery is nowhere near it', () => {
            // Started part-charged at 63% — 100% would be empty space.
            expect(niceAxisBounds(41, 63, BATTERY).max).toBe(65);
        });

        it('should respect clampMax without clipping data that exceeds it', () => {
            const axis = niceAxisBounds(40, 118, { clampMax: 100 });
            expect(axis.max).toBeGreaterThanOrEqual(118);
        });

        it('should round bounds out to whole multiples of the step', () => {
            const axis = niceAxisBounds(103, 187);
            expect(axis.min % axis.step).toBe(0);
            expect(axis.max % axis.step).toBe(0);
            expect(axis.min).toBeLessThanOrEqual(103);
            expect(axis.max).toBeGreaterThanOrEqual(187);
        });

        it('should snap the floor to zero when data already runs near it', () => {
            // Speed 0.4 - 14 km/h: zero is the natural floor.
            expect(niceAxisBounds(0.4, 14).min).toBe(0);
        });

        it('should not snap to zero when the data sits well above it', () => {
            // Heart rate 120 - 178: starting at 0 would squash the useful part.
            expect(niceAxisBounds(120, 178).min).toBeGreaterThan(0);
        });

        it('should never snap to zero when snapZeroWithin is 0', () => {
            const axis = niceAxisBounds(50, 180, { snapZeroWithin: 0 });
            expect(axis.min).toBe(50);
        });

        it('should force a zero floor when asked', () => {
            expect(niceAxisBounds(12, 40, { zeroBased: true }).min).toBe(0);
        });

        it('should allow negatives for metrics that go below zero', () => {
            const axis = niceAxisBounds(-8, 21);
            expect(axis.min).toBeLessThan(0);
            expect(axis.max).toBeGreaterThanOrEqual(21);
        });

        it('should clamp the floor at zero when negatives are impossible', () => {
            const axis = niceAxisBounds(2, 9, { allowNegative: false, snapZeroWithin: 0 });
            expect(axis.min).toBeGreaterThanOrEqual(0);
        });

        it('should open out a readable band around a flat line', () => {
            const axis = niceAxisBounds(75, 75);
            expect(axis.max).toBeGreaterThan(axis.min);
            expect(75).toBeGreaterThanOrEqual(axis.min);
            expect(75).toBeLessThanOrEqual(axis.max);
        });

        it('should handle a flat line at zero', () => {
            const axis = niceAxisBounds(0, 0);
            expect(axis.max).toBeGreaterThan(axis.min);
            expect(Number.isFinite(axis.step)).toBe(true);
        });

        it('should cope with reversed and non-finite input', () => {
            expect(niceAxisBounds(90, 10).min).toBeLessThan(niceAxisBounds(90, 10).max);
            const junk = niceAxisBounds(NaN, Infinity);
            expect(Number.isFinite(junk.min)).toBe(true);
            expect(Number.isFinite(junk.max)).toBe(true);
        });

        it('should return ascending ticks spanning exactly min to max', () => {
            const axis = niceAxisBounds(3, 97);
            expect(axis.ticks[0]).toBe(axis.min);
            expect(axis.ticks[axis.ticks.length - 1]).toBe(axis.max);
            for (let i = 1; i < axis.ticks.length; i++) {
                expect(axis.ticks[i]).toBeGreaterThan(axis.ticks[i - 1]);
            }
        });

        it('should not emit floating point noise in tick values', () => {
            const axis = niceAxisBounds(0, 0.5);
            axis.ticks.forEach(t => {
                expect(String(t)).not.toMatch(/\d{6,}/);
            });
        });

        it('should use time-friendly steps for pace', () => {
            const axis = niceAxisBounds(4.6, 6.4, {
                stepLadder: PACE_STEPS,
                snapZeroWithin: 0
            });
            // Step should be a round number of seconds.
            expect(Math.round(axis.step * 60) % 5).toBe(0);
        });

        it('should respect targetTicks', () => {
            const few = niceAxisBounds(0, 100, { targetTicks: 2 });
            const many = niceAxisBounds(0, 100, { targetTicks: 10 });
            expect(many.ticks.length).toBeGreaterThan(few.ticks.length);
        });
    });
});
