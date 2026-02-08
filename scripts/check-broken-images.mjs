import { PrismaClient } from '@prisma/client';
import https from 'https';
import http from 'http';

const prisma = new PrismaClient();

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || url.length < 10) {
      resolve({ url, status: 'invalid' });
      return;
    }

    const client = url.startsWith('https') ? https : http;

    const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      resolve({ url, status: res.statusCode });
    });

    req.on('error', () => {
      resolve({ url, status: 'error' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 'timeout' });
    });

    req.end();
  });
}

async function main() {
  const posts = await prisma.posts.findMany({
    where: { status: 'published' },
    select: { slug: true, featured_image: true, content: true }
  });

  console.log('Checking images in', posts.length, 'posts...\n');

  const brokenFeatured = [];
  const brokenContent = [];
  const badDomains = [];

  for (const post of posts) {
    // Check featured image
    if (post.featured_image) {
      // Check for bad domains first
      if (post.featured_image.includes('images.filmmyrun.co.uk') ||
          post.featured_image.includes('filmmyrun.co.uk/wp-content')) {
        badDomains.push({ slug: post.slug, url: post.featured_image, type: 'featured' });
      } else if (post.featured_image.startsWith('http')) {
        const result = await checkUrl(post.featured_image);
        if (result.status !== 200) {
          brokenFeatured.push({ slug: post.slug, url: post.featured_image, status: result.status });
        }
      } else if (post.featured_image.startsWith('/')) {
        // Relative path - these won't work
        brokenFeatured.push({ slug: post.slug, url: post.featured_image, status: 'relative' });
      }
    }

    // Check content images
    const imgMatches = post.content?.match(/src="([^"]+)"/gi) || [];
    for (const match of imgMatches) {
      const url = match.replace('src="', '').replace('"', '');

      if (url.includes('images.filmmyrun.co.uk') ||
          url.includes('filmmyrun.co.uk/wp-content')) {
        badDomains.push({ slug: post.slug, url, type: 'content' });
      }
    }
  }

  // Report bad domains
  if (badDomains.length > 0) {
    console.log('='.repeat(70));
    console.log('IMAGES WITH BAD DOMAINS (will not work)');
    console.log('='.repeat(70));
    badDomains.forEach(b => {
      console.log(`\n${b.slug} (${b.type}):`);
      console.log(`  ${b.url}`);
    });
    console.log(`\nTotal: ${badDomains.length}`);
  }

  // Report broken featured images
  if (brokenFeatured.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('BROKEN FEATURED IMAGES (404 or error)');
    console.log('='.repeat(70));
    brokenFeatured.forEach(b => {
      console.log(`\n${b.slug} (${b.status}):`);
      console.log(`  ${b.url}`);
    });
    console.log(`\nTotal: ${brokenFeatured.length}`);
  }

  // Report broken content images
  if (brokenContent.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('BROKEN CONTENT IMAGES');
    console.log('='.repeat(70));
    brokenContent.forEach(b => {
      console.log(`${b.slug}: ${b.url} (${b.status})`);
    });
    console.log(`\nTotal: ${brokenContent.length}`);
  }

  if (badDomains.length === 0 && brokenFeatured.length === 0 && brokenContent.length === 0) {
    console.log('✅ No broken images found!');
  }

  await prisma.$disconnect();
}

main();
