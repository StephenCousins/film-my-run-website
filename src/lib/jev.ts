/**
 * One call to Jev (TypeSafe's decision model) through OpenRouter's Decisions API: state plus typed
 * questions in, typed answers out. Billed to OpenRouter credits like any other model. Throws on a
 * failed call; Jev has no fallback of its own, so callers fall back to a chat model.
 */
export const JEV_MODEL = 'typesafe/jev-1.13';

export async function decide<A>(state: Record<string, unknown>, questions: Record<string, unknown>): Promise<{ answers: A; costUsd: number }> {
  const res = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: JEV_MODEL, state, questions }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const r = (await res.json()) as { answers: A; usage?: { cost?: number } };
  return { answers: r.answers, costUsd: r.usage?.cost ?? 0 };
}
