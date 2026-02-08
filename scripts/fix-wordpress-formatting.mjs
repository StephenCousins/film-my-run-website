import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function extractImages(content) {
  const images = [];

  // Try figure elements first
  const figureRegex = /<figure[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?(?:<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?[\s\S]*?<\/figure>/gi;
  let match;
  while ((match = figureRegex.exec(content)) !== null) {
    images.push({
      src: match[1],
      caption: match[2] ? match[2].replace(/<[^>]+>/g, '').trim() : null
    });
  }

  // If no figures, try standalone img tags
  if (images.length === 0) {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*\/?>/gi;
    while ((match = imgRegex.exec(content)) !== null) {
      images.push({
        src: match[1],
        caption: match[2] || null
      });
    }
  }

  return images;
}

function removeAllImages(content) {
  let cleaned = content.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '');
  cleaned = cleaned.replace(/<img[^>]+\/?>/gi, '');
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned;
}

function createStyledImage(src, caption, style, title) {
  const alt = caption || title || 'Race photo';
  let html = `\n<figure class="${style}">\n`;
  html += `  <img src="${src}" alt="${alt}" loading="lazy" />\n`;
  if (caption) {
    html += `  <figcaption>${caption}</figcaption>\n`;
  }
  html += `</figure>`;
  return html;
}

function needsStyling(content) {
  const imgCount = (content.match(/<img/gi) || []).length;
  if (imgCount === 0) return false;

  const hasRacePhoto = content.includes('race-photo');
  const hasPhotoFloat = content.includes('photo-float');

  return !hasRacePhoto && !hasPhotoFloat;
}

async function fixPost(post) {
  const images = extractImages(post.content);

  if (images.length === 0) {
    return { slug: post.slug, status: 'no images', count: 0 };
  }

  // Remove existing images
  let cleaned = removeAllImages(post.content);

  // Split into content blocks
  const blocks = cleaned.split(/(?=<p>|<h2|<h3|<blockquote)/i).filter(b => b.trim());

  if (blocks.length < 2) {
    // Very short content - add images at end with styling
    let result = cleaned;
    images.forEach((img, i) => {
      const style = i === 0 ? 'race-photo' : (i % 2 === 1 ? 'photo-float-right' : 'photo-float-left');
      result += createStyledImage(img.src, img.caption, style, post.title);
    });
    result += '\n<div style="clear:both"></div>';

    await prisma.posts.update({
      where: { id: post.id },
      data: { content: result }
    });

    return { slug: post.slug, status: 'fixed', count: images.length };
  }

  // Calculate insertion points - distribute evenly
  const insertPoints = [];
  const spacing = Math.floor(blocks.length / (images.length + 1));
  for (let i = 0; i < images.length; i++) {
    insertPoints.push(Math.min(spacing * (i + 1), blocks.length - 1));
  }

  // Build new content with images distributed
  let result = '';
  let imgIndex = 0;

  blocks.forEach((block, i) => {
    result += block;
    if (insertPoints.includes(i) && imgIndex < images.length) {
      const img = images[imgIndex];
      const style = imgIndex === 0 ? 'race-photo' : (imgIndex % 2 === 1 ? 'photo-float-right' : 'photo-float-left');
      result += createStyledImage(img.src, img.caption, style, post.title);
      imgIndex++;
    }
  });

  // Add any remaining images
  while (imgIndex < images.length) {
    const img = images[imgIndex];
    const style = imgIndex === 0 ? 'race-photo' : (imgIndex % 2 === 1 ? 'photo-float-right' : 'photo-float-left');
    result += createStyledImage(img.src, img.caption, style, post.title);
    imgIndex++;
  }

  result += '\n<div style="clear:both"></div>';

  await prisma.posts.update({
    where: { id: post.id },
    data: { content: result }
  });

  return { slug: post.slug, status: 'fixed', count: images.length };
}

async function main() {
  // Get all WordPress posts (created before 2025 and no youtubeId)
  const allPosts = await prisma.posts.findMany({
    where: {
      status: 'published',
      post_type: 'post'
    },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      created_at: true,
      meta: true
    }
  });

  // Filter to WordPress posts (not auto-generated)
  const wpPosts = allPosts.filter(p => {
    const year = new Date(p.created_at).getFullYear();
    const hasYoutubeId = p.meta && p.meta.youtubeId;
    // WordPress posts: created before 2025 AND no youtubeId
    return year < 2025 && !hasYoutubeId;
  });

  // Filter to those needing styling
  const needsWork = wpPosts.filter(p => needsStyling(p.content));

  console.log('='.repeat(70));
  console.log('FORMATTING WORDPRESS POSTS');
  console.log('='.repeat(70));
  console.log(`\nTotal WordPress posts: ${wpPosts.length}`);
  console.log(`Posts needing formatting: ${needsWork.length}\n`);

  if (needsWork.length === 0) {
    console.log('✅ All WordPress posts are already formatted!');
    await prisma.$disconnect();
    return;
  }

  let fixed = 0;
  let noImages = 0;

  for (const post of needsWork) {
    const result = await fixPost(post);

    if (result.status === 'fixed') {
      console.log(`✅ ${result.slug} - ${result.count} images styled`);
      fixed++;
    } else {
      console.log(`📝 ${result.slug} - ${result.status}`);
      noImages++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Done! Fixed: ${fixed}, No images: ${noImages}`);

  await prisma.$disconnect();
}

main();
