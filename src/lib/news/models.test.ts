import { describe, expect, it } from 'vitest';
import { parseJson } from '@/lib/llm';

describe('parseJson', () => {
  it('reads plain JSON, fenced JSON, and gives null for rubbish', () => {
    expect(parseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    expect(parseJson<{ a: number }>('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(parseJson('not json')).toBeNull();
    expect(parseJson('{"a":')).toBeNull();
  });
});
