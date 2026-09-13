import { describe, it, expect } from 'vitest';
import { normalise } from './normalise';
import type { Brand } from '../brands';

const brands: Brand[] = [
  { id: 1, name: 'Hoka', aliases: ['hoka'], domain: 'hoka.com', newArrivalsUrl: null },
  { id: 2, name: 'La Sportiva', aliases: ['la sportiva'], domain: 'lasportiva.com', newArrivalsUrl: null },
];
const nom = (title: string, source = 'feed') => ({ modelText: title, title, url: `https://x/${title}`, publishedAt: null, source });

describe('normalise', () => {
  it('asks the LLM once, resolves brands and groups by slug', async () => {
    let calls = 0;
    const r = await normalise([nom('Hoka Clifton 10 Review'), nom('HOKA Clifton 10 first look'), nom('Asics Ultra Raptor II review')], brands, {
      completeText: async () => { calls++; return JSON.stringify([{ i: 0, brand: 'Hoka', model: 'Clifton 10' }, { i: 1, brand: 'Hoka', model: 'Clifton 10' }, { i: 2, brand: 'Asics', model: 'Ultra Raptor II' }]); },
    });
    expect(calls).toBe(1);
    expect(r.resolved).toHaveLength(1);
    expect(r.resolved[0]).toMatchObject({ brand: { name: 'Hoka' }, model: 'Clifton 10', slug: 'hoka-clifton-10' });
    expect(r.resolved[0].nominations).toHaveLength(2);
    expect(r.unresolved).toEqual([expect.objectContaining({ brandText: 'Asics', model: 'Ultra Raptor II' })]);
  });
  it('prefers a brand supplied by the source over the LLM', async () => {
    const r = await normalise([{ ...nom('Clifton 10'), brandText: 'Hoka' }], brands, { completeText: async () => JSON.stringify([{ i: 0, brand: 'Hokа', model: 'Clifton 10' }]) });
    expect(r.resolved[0].brand.name).toBe('Hoka');
  });
  it('drops rows the LLM returns without a version-bearing model', async () => {
    const r = await normalise([nom('Best trail shoes 2026')], brands, { completeText: async () => JSON.stringify([{ i: 0, brand: 'Hoka', model: '' }]) });
    expect(r.resolved).toHaveLength(0);
    expect(r.unresolved).toHaveLength(0);
  });
  it('keeps a suffix-only model such as GTX even without a version number', async () => {
    const r = await normalise([nom('Hoka Speedgoat GTX review')], brands, { completeText: async () => JSON.stringify([{ i: 0, brand: 'Hoka', model: 'Speedgoat GTX' }]) });
    expect(r.resolved).toHaveLength(1);
    expect(r.resolved[0].slug).toBe('hoka-speedgoat-gtx');
  });
  it('returns nothing on unparseable LLM output', async () => {
    const r = await normalise([nom('x 2')], brands, { completeText: async () => 'sorry' });
    expect(r).toEqual({ resolved: [], unresolved: [] });
  });
  it('does not call the LLM when there are no nominations', async () => {
    let calls = 0;
    const r = await normalise([], brands, { completeText: async () => { calls++; return '[]'; } });
    expect(calls).toBe(0);
    expect(r).toEqual({ resolved: [], unresolved: [] });
  });
  it('sends the prompt with one tab-separated line per nomination and a 2000-token cap', async () => {
    let seen: { prompt: string; maxTokens: number } | null = null;
    await normalise([{ ...nom('Clifton 10 review'), brandText: 'Hoka' }, nom('Bondi 9 review')], brands, {
      completeText: async (o: { prompt: string; maxTokens: number }) => { seen = o; return '[]'; },
    });
    expect(seen!.maxTokens).toBe(2000);
    expect(seen!.prompt).toContain('0\tHoka\tClifton 10 review');
    expect(seen!.prompt).toContain('1\t\tBondi 9 review');
  });
});
