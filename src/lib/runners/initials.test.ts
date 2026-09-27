import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('takes the first letter of the first and last words', () => {
    expect(initials('Kilian Jornet Burgada')).toBe('KB');
    expect(initials('Ida Amelie Robsahm')).toBe('IR');
  });
  it('falls back to one letter for a single word', () => {
    expect(initials('Kilian')).toBe('K');
  });
});
