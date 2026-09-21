import { describe, expect, it } from 'vitest';
import { memberPrice } from './price';

describe('memberPrice', () => {
  it('takes 10% off, rounded half up to the penny', () => {
    expect(memberPrice(19.99)).toBe(17.99);
    expect(memberPrice(24.5)).toBe(22.05);
    expect(memberPrice(0.05)).toBe(0.05);
    expect(memberPrice(29.95)).toBe(26.96);
  });
});
