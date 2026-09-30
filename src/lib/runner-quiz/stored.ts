'use client';
/**
 * The visitor's last quiz result, kept in this browser so the shop can show "Your type · £3 off"
 * and put their Runner DNA on any shirt. Validated on every read (type must match scores).
 */
import { useEffect, useState } from 'react';
import { parseResult, type QuizType, type Scores } from './index';

const KEY = 'fmr-quiz-result';

export type StoredResult = { type: QuizType; scores: Scores };

export function saveResult(type: string, scores: Scores) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ type, scores }));
  } catch {
    // Private window or blocked storage: the shop just won't know.
  }
}

export function readResult(): StoredResult | null {
  try {
    return parseResult(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return null;
  }
}

/** The stored result, read after mount (null on the server and the first render). */
export function useStoredResult(): StoredResult | null {
  const [r, setR] = useState<StoredResult | null>(null);
  useEffect(() => setR(readResult()), []);
  return r;
}
