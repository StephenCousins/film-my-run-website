import OpenAI from 'openai';

/**
 * LLM calls for the Shoe Finder, routed through OpenRouter.
 *
 * These are small, mechanical jobs — pull JSON out of a search snippet, score a
 * review, answer yes/no — so they run on a cheap model rather than a frontier
 * one. Gemini 2.5 Flash Lite is ~10x cheaper per input token than Claude Haiku
 * 4.5 ($0.10/$0.40 per MTok vs $1.00/$5.00) and holds up on the two things this
 * code actually needs: following a "reply with ONLY JSON" instruction, and
 * short structured answers. It also accepts images, so the shoe image
 * verification can move here later without another provider change.
 *
 * Override with OPENROUTER_MODEL if a different model suits better.
 */
const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';

/**
 * For work where the writing itself is the product — race scripts, news
 * stories in a particular voice — rather than pulling fields out of text.
 * DeepSeek V3.2 is $0.269/$0.400 per MTok against Claude Opus 4.8's
 * $5.00/$25.00, so a 4k-token piece costs about a sixth of a penny instead
 * of ten pence, and it holds a voice far better than a flash-tier model.
 */
export const WRITING_MODEL = 'deepseek/deepseek-v3.2';

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    // OpenRouter attributes usage to your app with these; both are optional.
    defaultHeaders: {
      'HTTP-Referer': 'https://filmmyrun.com',
      'X-Title': 'Film My Run',
    },
  });
}

export interface CompleteOptions {
  prompt: string;
  maxTokens: number;
  /** Optional system prompt, sent as a leading system message. */
  system?: string;
  /** Low by default — every caller here wants a deterministic, parseable answer. */
  temperature?: number;
  model?: string;
}

/**
 * Single-turn completion returning plain text.
 *
 * Mirrors how the Anthropic calls it replaced were used: one user message in,
 * the first text block out. Returns '' rather than throwing when the model
 * gives back nothing, so callers keep their existing "empty means skip"
 * handling.
 */
export async function completeText({
  prompt,
  maxTokens,
  system,
  temperature = 0,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
}: CompleteOptions): Promise<string> {
  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      { role: 'user' as const, content: prompt },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

/**
 * Single-turn completion over an image URL, returning plain text.
 *
 * Used to check that a candidate shoe photo is a clean product shot. The model
 * fetches the URL itself, so nothing is downloaded server-side.
 */
export async function completeTextWithImage({
  prompt,
  imageUrl,
  maxTokens,
  temperature = 0,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
}: CompleteOptions & { imageUrl: string }): Promise<string> {
  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}
