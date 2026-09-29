'use client';
/** Basket lives in localStorage; a `fmr-basket` window event keeps the header badge in sync. */
import { useEffect, useState } from 'react';
import type { BasketLine } from './orders';
import type { Personal } from './runner-tee';

const KEY = 'fmr-basket';
const EVENT = 'fmr-basket';

export function readBasket(): BasketLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function writeBasket(lines: BasketLine[]) {
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* private mode etc. */ }
  window.dispatchEvent(new Event(EVENT));
}

const samePersonal = (a?: Personal, b?: Personal) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function addToBasket(slug: string, variantId: number | string, quantity = 1, personal?: Personal) {
  const lines = readBasket();
  const hit = lines.find((l) => l.slug === slug && l.variantId === variantId && samePersonal(l.personal, personal));
  if (hit) hit.quantity = Math.min(10, hit.quantity + quantity);
  else lines.push({ slug, variantId, quantity, ...(personal && { personal }) });
  writeBasket(lines);
}

export function useBasket() {
  const [lines, setLines] = useState<BasketLine[]>([]);
  useEffect(() => {
    const sync = () => setLines(readBasket());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return { lines, set: writeBasket, count: lines.reduce((n, l) => n + l.quantity, 0) };
}
