import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function searchAllImages() {
  const posts = await prisma.posts.findMany({
    where: { status: 'published' },
    select: { slug: true, content: true, featured_image: true }
  });

  const allImages = new Map();

  for (const post of posts) {
    const content = post.content || '';
    const imgs = content.match(/src="(https:\/\/[^"]+\.jpg)"/gi) || [];

    imgs.forEach(img => {
      const match = img.match(/src="([^"]+)"/);
      if (match) {
        const url = match[1];
        if (!allImages.has(url)) {
          allImages.set(url, []);
        }
        allImages.get(url).push(post.slug);
      }
    });

    if (post.featured_image) {
      if (!allImages.has(post.featured_image)) {
        allImages.set(post.featured_image, []);
      }
      allImages.get(post.featured_image).push(post.slug + ' (featured)');
    }
  }

  console.log('Images used in multiple posts:');
  let found = false;
  for (const [url, posts] of allImages) {
    if (posts.length > 1) {
      found = true;
      console.log('\n' + url.split('/').pop());
      console.log('  Used in: ' + posts.join(', '));
    }
  }

  if (!found) {
    console.log('None found - all images are unique to their posts.');
  }

  await prisma.$disconnect();
}

searchAllImages();
