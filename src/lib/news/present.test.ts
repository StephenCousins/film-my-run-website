import { describe, expect, it } from 'vitest';
import { storyTags } from './present';

describe('story tags', () => {
  it('a topic label, plus UK when British', () => {
    expect(storyTags('trail_ultra', true)).toEqual(['Trail & Ultra', 'UK']);
    expect(storyTags('road', false)).toEqual(['Road']);
    expect(storyTags(null, false)).toEqual(['Trail & Ultra']);
  });
});
