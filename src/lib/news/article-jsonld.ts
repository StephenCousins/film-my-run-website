interface StoryForJsonLd {
  title: string;
  excerpt: string;
  publishedAt: string;
  imageUrl: string | null;
}

/** The NewsArticle JSON-LD for a story page: the excerpt as description, the canonical URL as mainEntityOfPage. */
export function buildArticleJsonLd(story: StoryForJsonLd, storyUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.title,
    description: story.excerpt,
    datePublished: story.publishedAt,
    image: story.imageUrl ? [story.imageUrl] : [],
    mainEntityOfPage: { '@type': 'WebPage', '@id': storyUrl },
    author: {
      '@type': 'Organization',
      name: 'Film My Run',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Film My Run',
    },
  };
}
