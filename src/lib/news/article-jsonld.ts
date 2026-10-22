interface StoryForJsonLd {
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
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
    dateModified: story.updatedAt ?? story.publishedAt,
    image: story.imageUrl ? [story.imageUrl] : [],
    mainEntityOfPage: { '@type': 'WebPage', '@id': storyUrl },
    author: {
      '@type': 'Organization',
      name: 'Film My Run',
      url: 'https://filmmyrun.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Film My Run',
      url: 'https://filmmyrun.com',
      logo: { '@type': 'ImageObject', url: 'https://filmmyrun.com/og-image.jpg' },
    },
  };
}
