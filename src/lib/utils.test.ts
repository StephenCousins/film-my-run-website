import { describe, it, expect } from 'vitest';
import { calculateReadTime, truncate, slugify } from './utils';

describe('calculateReadTime', () => {
  it('returns 1 for short content', () => {
    expect(calculateReadTime('hello world')).toBe(1);
  });

  it('calculates correctly for longer content', () => {
    // 200 words per minute, so 400 words = 2 minutes
    const words = Array(400).fill('word').join(' ');
    expect(calculateReadTime(words)).toBe(2);
  });

  it('rounds up to the next minute', () => {
    const words = Array(201).fill('word').join(' ');
    expect(calculateReadTime(words)).toBe(2);
  });
});

describe('truncate', () => {
  it('returns the original string if shorter than limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns the original string if equal to limit', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and adds ellipsis for long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('trims trailing whitespace before adding ellipsis', () => {
    expect(truncate('hello world foo', 6)).toBe('hello...');
  });
});

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('my great post')).toBe('my-great-post');
  });

  it('removes special characters', () => {
    expect(slugify("It's a test! Right?")).toBe('its-a-test-right');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('handles mixed input', () => {
    expect(slugify('The 2024 London Marathon: A Review')).toBe(
      'the-2024-london-marathon-a-review'
    );
  });
});
