import Anthropic from '@anthropic-ai/sdk';
import type { RawStorySection } from './irunfar-scraper';

// ============================================
// TYPES
// ============================================

export interface ExtractedStory {
  originalHeading: string;
  title: string;
  location: string;
  isUkRelated: boolean;
  isElite: boolean;
  importance: number; // 1-10
  keyFacts: string[];
  priority: number; // lower = higher priority
}

export interface SynthesizedStory {
  title: string;
  excerpt: string;
  content: string; // HTML
  slug: string;
  sourceHeading: string;
  priority: number;
}

// ============================================
// CLIENT
// ============================================

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  return new Anthropic({ apiKey });
}

// ============================================
// STAGE A — EXTRACT & PRIORITISE
// ============================================

export async function extractAndPrioritise(
  sections: RawStorySection[]
): Promise<ExtractedStory[]> {
  const client = getClient();

  // Build a summary of each section for the AI
  const sectionSummaries = sections.map((s, i) => {
    let text = `## Section ${i + 1}: ${s.heading}\n`;
    text += s.paragraphs.join('\n');
    if (s.results.length > 0) {
      text += '\nResults:\n' + s.results.map((r) => `- ${r}`).join('\n');
    }
    if (s.subsections.length > 0) {
      for (const sub of s.subsections) {
        text += `\n### ${sub.heading}\n`;
        text += sub.paragraphs.join('\n');
      }
    }
    return text;
  });

  const prompt = `You are analysing an iRunFar "This Week in Running" roundup article. Each section below describes a race or running event.

For each section, extract:
1. A compelling news headline (title) — short, engaging, specific
2. Location (city/region and country)
3. Whether it's UK-related (true/false) — UK runners winning, UK races, British athletes
4. Whether it involves elite/professional athletes (true/false)
5. Importance score (1-10, where 10 is the most significant story)
6. 3-5 key facts (specific times, placements, records, conditions)

Assign a priority score for each story:
- UK-related stories: 10-20 (lower = more important)
- Major elite international races: 30-40
- Everything else: 50+

Sections from the "Additional Races" area are typically less important — give them priority 60+.

Return ONLY valid JSON — an array of objects with these fields:
- originalHeading (string — the exact section heading)
- title (string)
- location (string)
- isUkRelated (boolean)
- isElite (boolean)
- importance (number 1-10)
- keyFacts (string[])
- priority (number)

Here are the sections:

${sectionSummaries.join('\n\n---\n\n')}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON array for extraction');
  }

  const extracted: ExtractedStory[] = JSON.parse(jsonMatch[0]);
  return extracted.sort((a, b) => a.priority - b.priority);
}

// ============================================
// STAGE B — REWRITE STORIES
// ============================================

export async function rewriteStory(
  story: ExtractedStory,
  rawSection: RawStorySection,
  roundupUrl: string
): Promise<SynthesizedStory> {
  const client = getClient();

  const sectionContent = [
    ...rawSection.paragraphs,
    ...rawSection.results.map((r) => `- ${r}`),
    ...rawSection.subsections.flatMap((s) => [
      `### ${s.heading}`,
      ...s.paragraphs,
    ]),
  ].join('\n');

  const prompt = `You are writing a short news article for Film My Run (filmmyrun.com), a British trail and ultra running website.

Write about this race/event based on the source material below. Your voice should be:
- Conversational British English (not formal, not laddish — think knowledgeable running mate at the pub)
- Enthusiastic but not hyperbolic
- Include specific times, placements, and results where available
- Accessible to club runners, not just elite followers

Format:
- Title: A compelling, specific headline (not clickbait)
- Excerpt: One sentence summary (max 160 characters)
- Content: Exactly 2 paragraphs of HTML (<p> tags). First paragraph sets the scene and covers the main result. Second paragraph adds context, other notable results, or what it means.

Key facts to include: ${story.keyFacts.join('; ')}
Location: ${story.location}
Original heading: ${story.originalHeading}

Source material:
${sectionContent}

Return ONLY valid JSON with these fields:
- title (string)
- excerpt (string — max 160 chars)
- content (string — HTML with <p> tags)
- slug (string — URL-friendly, lowercase, hyphens, no special chars, max 60 chars)`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`AI did not return valid JSON for story: ${story.originalHeading}`);
  }

  const rewritten = JSON.parse(jsonMatch[0]) as {
    title: string;
    excerpt: string;
    content: string;
    slug: string;
  };

  return {
    ...rewritten,
    sourceHeading: story.originalHeading,
    priority: story.priority,
  };
}

// ============================================
// FULL PIPELINE
// ============================================

/**
 * Run the full extraction + rewrite pipeline.
 * Returns top stories (default 8) rewritten in FMR voice.
 */
export async function synthesizeStories(
  sections: RawStorySection[],
  roundupUrl: string,
  maxStories: number = 8
): Promise<SynthesizedStory[]> {
  // Stage A: Extract and prioritise all sections
  const allSections = expandAdditionalRaces(sections);
  const extracted = await extractAndPrioritise(allSections);

  // Take the top N stories by priority
  const topStories = extracted.slice(0, maxStories);

  // Stage B: Rewrite each story (sequentially to avoid rate limits)
  const synthesized: SynthesizedStory[] = [];

  for (const story of topStories) {
    // Find the matching raw section
    const rawSection = allSections.find((s) => s.heading === story.originalHeading);
    if (!rawSection) continue;

    try {
      const result = await rewriteStory(story, rawSection, roundupUrl);
      synthesized.push(result);
    } catch (err) {
      console.error(`Failed to rewrite story "${story.originalHeading}":`, err);
    }
  }

  return synthesized;
}

/**
 * Expand "Additional Races" section into individual sections per h3.
 */
function expandAdditionalRaces(sections: RawStorySection[]): RawStorySection[] {
  const expanded: RawStorySection[] = [];

  for (const section of sections) {
    if (section.isAdditionalRaces && section.subsections.length > 0) {
      // Each subsection becomes its own top-level section
      for (const sub of section.subsections) {
        expanded.push({
          heading: sub.heading,
          paragraphs: sub.paragraphs,
          images: sub.images,
          results: [],
          subsections: [],
          isAdditionalRaces: true,
        });
      }
    } else {
      expanded.push(section);
    }
  }

  return expanded;
}
