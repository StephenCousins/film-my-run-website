import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slugsToFix = [
  'south-downs-way-100-2024',
  'london-marathon-2024',
  'brighton-marathon-2024',
  'ben-nevis-ultra-2022',
  'weald-challenge-50k-2016',
  'marathon-madness-day-5-2018',
  'gun-31-guernsey-2019',
  'centurion-croc-100-lockdown-2020',
  'tds-2021-race-abandoned',
  'val-daran-100-utmb-2021',
  'goodwood-marathon-2020-sub-3',
  'serpent-trail-100k-july-2021',
  'southend-pier-marathon-2018',
  'arc-of-attrition-2019',
  'paris-marathon-2018',
  'rat-plague-2018',
  'mouth-to-mouth-marathon-2018',
  'crafty-fox-marathon-2018',
  'larmer-tree-marathon-2021-summer-llama',
  'virtual-london-marathon-2020-running-my-own-race',
  'bewl-water-marathon-2020-september-gem',
  'vanguard-way-marathon-first-race-after-lockdown-2020',
  'paris-marathon-2021-decade-of-running',
  'guernsey-gu36-victorias-first-ultra-2019',
  'atlantic-coast-challenge-2017',
  'run-jurassic-ultra-2019',
  'centurion-croc-100-2020',
  'serpent-trail-100k-2021',
  'sunrise-ultra-2021-norfolk-coast',
  '1066-ultramarathon-2019-harolds-march',
  'tenerife-bluetrail-2019-sea-to-summit',
  'south-downs-way-100-2018',
  'utmb-ccc-2018-first-taste-of-mont-blanc',
  'arc-of-attrition-100-2019',
  'cape-wrath-ultra-day-4-2024'
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

function createStyledImage(src, caption, style, title) {
  const alt = caption || title || 'Race photo';

  let figureClass = style;
  let html = `\n<figure class="${figureClass}">\n`;
  html += `  <img src="${src}" alt="${alt}" loading="lazy" />\n`;
  if (caption) {
    html += `  <figcaption>${caption}</figcaption>\n`;
  }
  html += `</figure>`;
  return html;
}

async function fixPost(slug) {
  const post = await prisma.posts.findFirst({
    where: { slug },
    select: { id: true, title: true, content: true }
  });

  if (!post) {
    return { slug, status: 'not found', images: 0 };
  }

  // Check if already styled
  const hasRacePhoto = post.content.includes('race-photo');
  const hasPhotoFloat = post.content.includes('photo-float');
  const imgCount = (post.content.match(/<img/gi) || []).length;

  if (imgCount === 0) {
    return { slug, status: 'no images', images: 0 };
  }

  if (hasRacePhoto && hasPhotoFloat) {
    return { slug, status: 'already styled', images: imgCount };
  }

  const images = extractImages(post.content);
  if (images.length === 0) {
    return { slug, status: 'no extractable images', images: 0 };
  }

  // Remove existing images
  let cleaned = removeAllImages(post.content);

  // Split into content blocks
  const blocks = cleaned.split(/(?=<p>|<h2|<h3|<blockquote)/i).filter(b => b.trim());

  if (blocks.length < 2) {
    // Very short content - add images at strategic points
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

    return { slug, status: 'fixed', images: images.length };
  }

  // Calculate insertion points - distribute evenly
  const insertPoints = [];
  const spacing = Math.floor(blocks.length / (images.length + 1));
  for (let i = 0; i < images.length; i++) {
    insertPoints.push(Math.min(spacing * (i + 1), blocks.length - 1));
  }

  // Build new content
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

  return { slug, status: 'fixed', images: images.length };
}

async function main() {
  console.log('Fixing formatting on all 35 posts...');
  console.log('='.repeat(60));

  let fixed = 0;
  let alreadyOk = 0;
  let noImages = 0;
  let notFound = 0;

  for (const slug of slugsToFix) {
    const result = await fixPost(slug);

    if (result.status === 'fixed') {
      console.log(`✅ ${slug} - ${result.images} images styled`);
      fixed++;
    } else if (result.status === 'already styled') {
      console.log(`⏭️  ${slug} - already styled`);
      alreadyOk++;
    } else if (result.status === 'no images' || result.status === 'no extractable images') {
      console.log(`📝 ${slug} - no images to style`);
      noImages++;
    } else {
      console.log(`❌ ${slug} - ${result.status}`);
      notFound++;
    }
  }

  console.log('='.repeat(60));
  console.log(`Done! Fixed: ${fixed}, Already OK: ${alreadyOk}, No images: ${noImages}, Not found: ${notFound}`);

  await prisma.$disconnect();
}

main();
