import { prisma } from '../src/lib/db';

interface ImageIssue {
  slug: string;
  imageCount: number;
  issues: string[];
}

async function analyzePostImages() {
  const allPosts = await prisma.posts.findMany({
    where: { status: 'published' },
    select: { slug: true, content: true, title: true }
  });

  const postsWithIssues: ImageIssue[] = [];

  for (const post of allPosts) {
    const content = post.content || '';
    const issues: string[] = [];

    // Count images (both markdown and HTML)
    const markdownImages = content.match(/!\[.*?\]\(.*?\)/g) || [];
    const htmlImages = content.match(/<img[^>]*>/gi) || [];
    const totalImages = markdownImages.length + htmlImages.length;

    // Skip posts with fewer than 3 images
    if (totalImages < 3) continue;

    // Check for styling classes
    const hasRacePhotoClass = /class="[^"]*race-photo[^"]*"/i.test(content);
    const hasPhotoFloatClass = /class="[^"]*photo-float[^"]*"/i.test(content);
    const hasAnyPhotoClass = hasRacePhotoClass || hasPhotoFloatClass;

    if (!hasAnyPhotoClass) {
      issues.push('No styling classes (race-photo or photo-float)');
    }

    // Check for bunched images (multiple img tags in a row)
    const bunchedPattern = /<\/figure>\s*<figure|!\[.*?\]\(.*?\)\s*!\[.*?\]\(.*?\)/gi;
    const bunchedMatches = content.match(bunchedPattern);
    if (bunchedMatches && bunchedMatches.length > 0) {
      issues.push(`${bunchedMatches.length} bunched image(s) found`);
    }

    // Also check for consecutive image lines
    const lines = content.split('\n');
    let consecutiveImageLines = 0;
    let maxConsecutive = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^!\[.*?\]\(.*?\)$/) || trimmed.match(/^<img[^>]*>$/i) || trimmed.match(/^<figure[^>]*>/i)) {
        consecutiveImageLines++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveImageLines);
      } else if (trimmed.length > 0 && !trimmed.match(/^<\/figure>$/i) && !trimmed.match(/^<figcaption/i)) {
        consecutiveImageLines = 0;
      }
    }
    if (maxConsecutive >= 2) {
      issues.push(`${maxConsecutive} consecutive image lines`);
    }

    // Check for figure/figcaption structure
    const figureCount = (content.match(/<figure[^>]*>/gi) || []).length;
    const figcaptionCount = (content.match(/<figcaption[^>]*>/gi) || []).length;
    
    if (figureCount === 0 && totalImages >= 3) {
      issues.push('No figure elements');
    } else if (figureCount > 0 && figcaptionCount < figureCount * 0.5) {
      issues.push(`Only ${figcaptionCount}/${figureCount} figures have captions`);
    }

    if (issues.length > 0) {
      postsWithIssues.push({
        slug: post.slug,
        imageCount: totalImages,
        issues
      });
    }
  }

  // Sort by image count (most images first)
  postsWithIssues.sort((a, b) => b.imageCount - a.imageCount);

  console.log('\n=== BLOG POSTS WITH IMAGE FORMATTING ISSUES ===\n');
  console.log(`Total published posts analyzed: ${allPosts.length}`);
  console.log(`Posts with issues: ${postsWithIssues.length}\n`);

  for (const post of postsWithIssues) {
    console.log(`\n--- ${post.slug} ---`);
    console.log(`  Images: ${post.imageCount}`);
    console.log(`  Issues:`);
    for (const issue of post.issues) {
      console.log(`    - ${issue}`);
    }
  }

  console.log('\n\n=== SUMMARY LIST OF SLUGS ===\n');
  for (const post of postsWithIssues) {
    console.log(post.slug);
  }

  await prisma.$disconnect();
}

analyzePostImages().catch(console.error);
