import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Posts to fix
const slugsToFix = [
  "beachy-head-marathon-2022",
  "beachy-head-marathon-2023",
  "in-the-footsteps-of-the-dukes-of-savoy-tds-2022",
  "transgrancanaria-classic-2022",
  "berlin-marathon-2022-how-not-to-pace-a-marathon",
  "manchester-marathon-2023",
  "cape-wrath-ultra-day-4-2024",
  "race-to-the-stones-2024",
  "utmb-occ-2024",
  "winter-on-the-downs-2024-storm-darragh",
  "brighton-marathon-2025",
  "manchester-marathon-2025",
  "race-to-the-king-2025",
  "race-to-the-stones-2025",
  "hurtwood-50k-2025",
  "uts-50k-utmb-snowdonia-2022",
  "montane-lakeland-100-2022",
  "brighton-marathon-2024",
  "london-marathon-2024",
  "south-downs-way-100-2024",
  "steyning-stinger-2023",
  "ridgeway-challenge-2025",
  "paris-marathon-2023-breaking-three-hours",
  "trans-gran-canaria-2025",
  "swiss-alps-100-2025"
];

function extractImages(content) {
  const images = [];
  // Match figure tags with images, or standalone img tags
  const figureRegex = /<figure[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?(?:<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?[\s\S]*?<\/figure>/gi;
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*\/?>/gi;

  let match;

  // First try to find figure elements
  while ((match = figureRegex.exec(content)) !== null) {
    images.push({
      original: match[0],
      src: match[1],
      caption: match[2] ? match[2].replace(/<[^>]+>/g, '').trim() : null
    });
  }

  // If no figures found, look for standalone images
  if (images.length === 0) {
    while ((match = imgRegex.exec(content)) !== null) {
      images.push({
        original: match[0],
        src: match[1],
        caption: match[2] || null
      });
    }
  }

  return images;
}

function removeAllImages(content) {
  // Remove figure elements
  let cleaned = content.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '');
  // Remove standalone img tags
  cleaned = cleaned.replace(/<img[^>]+\/?>/gi, '');
  // Remove image-gallery divs
  cleaned = cleaned.replace(/<div[^>]*class="[^"]*image-gallery[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned;
}

function createStyledImage(image, style, index) {
  const { src, caption } = image;

  if (style === 'race-photo') {
    return `
<figure class="race-photo">
  <img src="${src}" alt="${caption || 'Race photo'}" loading="lazy" />
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>`;
  } else if (style === 'float-right') {
    return `
<figure class="photo-float-right">
  <img src="${src}" alt="${caption || 'Race photo'}" loading="lazy" />
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>`;
  } else if (style === 'float-left') {
    return `
<figure class="photo-float-left">
  <img src="${src}" alt="${caption || 'Race photo'}" loading="lazy" />
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>`;
  }

  return `<figure class="race-photo"><img src="${src}" alt="${caption || 'Race photo'}" loading="lazy" /></figure>`;
}

function distributeImages(content, images) {
  if (images.length === 0) return content;

  // Remove existing images
  let cleanContent = removeAllImages(content);

  // Split into paragraphs
  const paragraphs = cleanContent.split(/(?=<p>|<h2|<h3|<blockquote|<div class="strava)/i);

  if (paragraphs.length < 2) {
    // Very short content - just add images at the end
    let imageHtml = '';
    images.forEach((img, i) => {
      const style = i === 0 ? 'race-photo' : (i % 2 === 1 ? 'float-right' : 'float-left');
      imageHtml += createStyledImage(img, style, i);
    });
    return cleanContent + imageHtml;
  }

  // Calculate insertion points
  const contentBlocks = paragraphs.filter(p => p.trim().length > 0);
  const insertionPoints = [];

  // First image after first paragraph or two
  insertionPoints.push(Math.min(2, Math.floor(contentBlocks.length * 0.1)));

  // Distribute remaining images evenly
  const remainingImages = images.length - 1;
  if (remainingImages > 0) {
    const spacing = Math.floor((contentBlocks.length - insertionPoints[0]) / (remainingImages + 1));
    for (let i = 1; i <= remainingImages; i++) {
      const point = insertionPoints[0] + (spacing * i);
      if (point < contentBlocks.length) {
        insertionPoints.push(point);
      }
    }
  }

  // Build new content with images inserted
  let result = '';
  let imageIndex = 0;

  contentBlocks.forEach((block, blockIndex) => {
    result += block;

    // Check if we should insert an image after this block
    if (insertionPoints.includes(blockIndex) && imageIndex < images.length) {
      const style = imageIndex === 0 ? 'race-photo' :
                   (imageIndex % 2 === 1 ? 'float-right' : 'float-left');
      result += createStyledImage(images[imageIndex], style, imageIndex);
      imageIndex++;
    }
  });

  // Add any remaining images at the end
  while (imageIndex < images.length) {
    const style = imageIndex === 0 ? 'race-photo' :
                 (imageIndex % 2 === 1 ? 'float-right' : 'float-left');
    result += createStyledImage(images[imageIndex], style, imageIndex);
    imageIndex++;
  }

  // Add clearfix at the end to handle floats
  result += '\n<div style="clear:both"></div>';

  return result;
}

async function fixPost(slug) {
  const post = await prisma.posts.findUnique({
    where: { slug },
    select: { id: true, slug: true, content: true }
  });

  if (!post) {
    console.log(`❌ ${slug} - NOT FOUND`);
    return false;
  }

  const images = extractImages(post.content);

  if (images.length === 0) {
    console.log(`⏭️ ${slug} - No images to style`);
    return false;
  }

  const newContent = distributeImages(post.content, images);

  await prisma.posts.update({
    where: { id: post.id },
    data: { content: newContent }
  });

  console.log(`✅ ${slug} - ${images.length} images styled and distributed`);
  return true;
}

async function main() {
  console.log('Styling auto-generated posts...');
  console.log('='.repeat(60));

  let fixed = 0;
  for (const slug of slugsToFix) {
    const success = await fixPost(slug);
    if (success) fixed++;
  }

  console.log('='.repeat(60));
  console.log(`Done! Fixed ${fixed} posts.`);

  await prisma.$disconnect();
}

main();
