import { describe, expect, it } from 'vitest';
import { runnerPose } from './runnerPose';

describe('cursor runner gait', () => {
  it('stands still with no swing', () => {
    const p = runnerPose(1.3, 0);
    expect(p.near).toEqual(p.far);
    expect(p.bob).toBeCloseTo(0);
  });
  it('legs and arms move against each other when running', () => {
    const p = runnerPose(Math.PI / 2, 1); // near leg forward, landing
    expect(p.near.thigh).toBeGreaterThan(30);
    expect(p.far.thigh).toBeLessThan(-20);
    expect(p.near.arm).toBeLessThan(0); // its arm swung back
  });
  it('the knee folds most just after toe-off and is near straight at landing', () => {
    const afterToeOff = runnerPose(-Math.PI / 4, 1).near.knee;
    const landing = runnerPose(Math.PI / 2, 1).near.knee;
    expect(afterToeOff).toBeGreaterThan(80);
    expect(landing).toBeLessThan(25);
  });
});
