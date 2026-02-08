import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slugsToFix = [
  'north-downs-way-100-2023',
  'thames-path-100-2023'
];

function extractImages(content) {
  const images = [];
  const figureRegex = /<figure[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?(?:<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?[\s\S]*?<\/figure>/gi;
  let match;
  while ((match = figureRegex.exec(content)) !== null) {
    images.push({
      src: match[1],
      caption: match[2] ? match[2].replace(/<[^>]+>/g, '').trim() : null
    });
  }

  if (images.length === 0) {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*\/?>/gi;
    while ((match = imgRegex.exec(content)) !== null) {
      images.push({ src: match[1], caption: null });
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

async function fixPost(slug) {
  const post = await prisma.posts.findFirst({
    where: { slug },
    select: { id: true, title: true, content: true }
  });

  if (!post) {
    console.log('❌ ' + slug + ' not found');
    return;
  }

  const images = extractImages(post.content);
  if (images.length === 0) {
    console.log('📝 ' + slug + ' has no images');
    return;
  }

  let cleaned = removeAllImages(post.content);
  const blocks = cleaned.split(/(?=<p>|<h2|<h3|<blockquote)/i).filter(b => b.trim());

  const insertPoints = [];
  const spacing = Math.floor(blocks.length / (images.length + 1));
  for (let i = 0; i < images.length; i++) {
    insertPoints.push(Math.min(spacing * (i + 1), blocks.length - 1));
  }

  let result = '';
  let imgIndex = 0;

  blocks.forEach((block, i) => {
    result += block;
    if (insertPoints.includes(i) && imgIndex < images.length) {
      const img = images[imgIndex];
      const style = imgIndex === 0 ? 'race-photo' : (imgIndex % 2 === 1 ? 'photo-float-right' : 'photo-float-left');
      const caption = img.caption || post.title;
      result += '\n<figure class="' + style + '">\n';
      result += '  <img src="' + img.src + '" alt="' + caption + '" loading="lazy" />\n';
      if (img.caption) {
        result += '  <figcaption>' + img.caption + '</figcaption>\n';
      }
      result += '</figure>';
      imgIndex++;
    }
  });

  result += '\n<div style="clear:both"></div>';

  await prisma.posts.update({
    where: { id: post.id },
    data: { content: result }
  });

  console.log('✅ ' + slug + ' - ' + images.length + ' images styled');
}

async function main() {
  for (const slug of slugsToFix) {
    await fixPost(slug);
  }
  await prisma.$disconnect();
}

main();
