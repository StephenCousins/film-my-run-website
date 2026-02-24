import axios from 'axios';
import * as cheerio from 'cheerio';

// ============================================
// TYPES
// ============================================

export interface RawStorySection {
  heading: string;
  paragraphs: string[];
  images: { src: string; alt: string }[];
  results: string[];
  subsections: { heading: string; paragraphs: string[]; images: { src: string; alt: string }[] }[];
  isAdditionalRaces: boolean;
}

// ============================================
// URL BUILDER
// ============================================

/**
 * Get the most recent Monday (or today if it's Monday).
 */
export function getMostRecentMonday(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since last Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Build the iRunFar TWIR URL for a given Monday date.
 * Format: https://www.irunfar.com/this-week-in-running-{month}-{day}-{year}
 */
export function buildTwirUrl(monday: Date): string {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const month = months[monday.getMonth()];
  const day = monday.getDate();
  const year = monday.getFullYear();
  return `https://www.irunfar.com/this-week-in-running-${month}-${day}-${year}`;
}

// ============================================
// SCRAPER
// ============================================

/**
 * Scrape and parse an iRunFar "This Week in Running" page.
 * Splits the article content by <h2> headings into individual story sections.
 */
export async function scrapeThisWeekInRunning(url: string): Promise<RawStorySection[]> {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'FilmMyRun-NewsScraper/1.0',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(html);

  // iRunFar's article content is inside .entry-content or article
  const contentEl = $('.entry-content').first();
  if (!contentEl.length) {
    throw new Error(`Could not find article content at ${url}`);
  }

  const sections: RawStorySection[] = [];
  let currentSection: RawStorySection | null = null;
  let currentSubsection: RawStorySection['subsections'][number] | null = null;

  // Iterate over direct children of the content area
  contentEl.children().each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase();
    if (!tag) return;

    // New top-level section on <h2>
    if (tag === 'h2') {
      // Save previous section
      if (currentSection) {
        if (currentSubsection) {
          currentSection.subsections.push(currentSubsection);
          currentSubsection = null;
        }
        sections.push(currentSection);
      }

      const heading = $(el).text().trim();
      const isAdditional = /additional\s+races?|other\s+races?|more\s+races?/i.test(heading);

      currentSection = {
        heading,
        paragraphs: [],
        images: [],
        results: [],
        subsections: [],
        isAdditionalRaces: isAdditional,
      };
      return;
    }

    // Skip content before the first h2
    if (!currentSection) return;

    // h3 subsections (common inside "Additional Races" section)
    if (tag === 'h3') {
      if (currentSubsection) {
        currentSection.subsections.push(currentSubsection);
      }
      currentSubsection = {
        heading: $(el).text().trim(),
        paragraphs: [],
        images: [],
      };
      return;
    }

    // Extract images
    if (tag === 'figure' || tag === 'img') {
      const img = tag === 'img' ? $(el) : $(el).find('img').first();
      const src = img.attr('src') || img.attr('data-src') || '';
      const alt = img.attr('alt') || '';
      if (src) {
        const imageData = { src, alt };
        if (currentSubsection) {
          currentSubsection.images.push(imageData);
        } else {
          currentSection.images.push(imageData);
        }
      }
      return;
    }

    // Paragraphs
    if (tag === 'p') {
      const text = $(el).text().trim();
      if (!text) return;

      // Also check for inline images
      $(el).find('img').each((_, imgEl) => {
        const src = $(imgEl).attr('src') || $(imgEl).attr('data-src') || '';
        const alt = $(imgEl).attr('alt') || '';
        if (src) {
          if (currentSubsection) {
            currentSubsection.images.push({ src, alt });
          } else {
            currentSection!.images.push({ src, alt });
          }
        }
      });

      if (currentSubsection) {
        currentSubsection.paragraphs.push(text);
      } else {
        currentSection.paragraphs.push(text);
      }
      return;
    }

    // Lists (race results are often in <ul> or <ol>)
    if (tag === 'ul' || tag === 'ol') {
      $(el).find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text) {
          currentSection!.results.push(text);
        }
      });
      return;
    }
  });

  // Don't forget the last section
  if (currentSection !== null) {
    if (currentSubsection !== null) {
      (currentSection as RawStorySection).subsections.push(currentSubsection);
    }
    sections.push(currentSection as RawStorySection);
  }

  // Filter out non-race sections (e.g. "Call for Comments", "This Week in Running" intro)
  const skipPatterns = [
    /^call\s+for\s+comments?/i,
    /^this\s+week\s+in\s+running$/i,
    /^looking\s+ahead/i,
    /^what\s+else/i,
  ];

  return sections.filter((s) => !skipPatterns.some((p) => p.test(s.heading)));
}
