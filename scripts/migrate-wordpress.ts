/**
 * WordPress to PostgreSQL Migration Script
 *
 * Migrates blog posts, categories, tags, and media from WordPress SQL dump
 * to the new PostgreSQL database.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// WordPress table prefix
const WP_PREFIX = 'wp_py2b8ks6v8_';

interface WPPost {
  ID: number;
  post_date: string;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_status: string;
  post_name: string;
  post_modified: string;
  post_type: string;
  guid: string;
}

// Extract data using grep and parse tuples
function extractWithGrep(sqlPath: string, pattern: string): string {
  try {
    const result = execSync(`grep -E "${pattern}" "${sqlPath}"`, {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024, // 100MB buffer
    });
    return result;
  } catch (error) {
    return '';
  }
}

// Parse a tuple like (1, 'value', 'another')
function parseTuple(tupleStr: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let depth = 0;

  for (let i = 0; i < tupleStr.length; i++) {
    const char = tupleStr[i];

    if (!inString) {
      if (char === '(' && depth === 0) {
        depth++;
        continue;
      }
      if (char === ')' && depth === 1) {
        if (current.trim()) {
          values.push(cleanValue(current.trim()));
        }
        break;
      }
      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === ',') {
        values.push(cleanValue(current.trim()));
        current = '';
      } else {
        current += char;
      }
    } else {
      if (char === '\\' && i + 1 < tupleStr.length) {
        current += char + tupleStr[i + 1];
        i++;
      } else if (char === stringChar) {
        current += char;
        inString = false;
      } else {
        current += char;
      }
    }
  }

  return values;
}

function cleanValue(v: string): string {
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    return v.slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }
  if (v === 'NULL') return '';
  return v;
}

// Calculate read time based on content length
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(' ').length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

// Main migration function
async function migrate() {
  console.log('Starting WordPress to PostgreSQL migration...\n');

  const sqlPath = path.join(__dirname, '../../filmmyrunwebsite.sql');
  console.log(`Reading SQL file from: ${sqlPath}`);

  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found!');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log(`SQL file size: ${(sql.length / 1024 / 1024).toFixed(2)} MB\n`);

  // ============================================
  // STEP 1: Extract thumbnail IDs from postmeta
  // ============================================
  console.log('Extracting thumbnail mappings...');
  const thumbnailMap = new Map<number, number>();

  // Match patterns like (25861, 10223, '_thumbnail_id', '10224')
  const thumbnailMatches = sql.match(/\(\d+,\s*\d+,\s*'_thumbnail_id',\s*'\d+'\)/g) || [];
  for (const match of thumbnailMatches) {
    const values = parseTuple(match);
    if (values.length >= 4) {
      const postId = parseInt(values[1]);
      const thumbId = parseInt(values[3]);
      thumbnailMap.set(postId, thumbId);
    }
  }
  console.log(`Found ${thumbnailMap.size} thumbnail mappings\n`);

  // ============================================
  // STEP 2: Extract attachment URLs from posts
  // ============================================
  console.log('Extracting attachments...');
  const attachmentUrls = new Map<number, string>();

  // Find all attachment posts - look for guid field containing wp-content/uploads
  const attachmentRegex = /\((\d+),\s*\d+,\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*\d+,\s*'(https?:\/\/[^']*wp-content\/uploads[^']*)'/g;

  let attachMatch;
  while ((attachMatch = attachmentRegex.exec(sql)) !== null) {
    const id = parseInt(attachMatch[1]);
    const guid = attachMatch[3];
    if (guid.includes('wp-content/uploads')) {
      attachmentUrls.set(id, guid);
    }
  }
  console.log(`Found ${attachmentUrls.size} attachments with URLs\n`);

  // ============================================
  // STEP 3: Extract terms (categories/tags)
  // ============================================
  console.log('Extracting terms...');
  const terms = new Map<number, { name: string; slug: string }>();

  // Match term patterns like (1, 'Running', 'running', 0)
  const termMatches = sql.match(/\(\d+,\s*'[^']*',\s*'[^']*',\s*\d+\)/g) || [];
  // Filter to only get terms from the terms table (not other similar patterns)
  const termSection = sql.substring(
    sql.indexOf(`INSERT INTO \`${WP_PREFIX}terms\``),
    sql.indexOf(`INSERT INTO \`${WP_PREFIX}term_relationships\``)
  );
  const termOnlyMatches = termSection.match(/\(\d+,\s*'[^']*',\s*'[^']*',\s*\d+\)/g) || [];

  for (const match of termOnlyMatches) {
    const values = parseTuple(match);
    if (values.length >= 3) {
      terms.set(parseInt(values[0]), {
        name: values[1],
        slug: values[2],
      });
    }
  }
  console.log(`Found ${terms.size} terms\n`);

  // ============================================
  // STEP 4: Extract term taxonomy (category vs tag)
  // ============================================
  console.log('Extracting term taxonomy...');
  const termTaxonomy = new Map<number, { termId: number; taxonomy: string }>();

  // Match term_taxonomy patterns
  const taxSection = sql.substring(
    sql.indexOf(`INSERT INTO \`${WP_PREFIX}term_taxonomy\``),
    sql.indexOf(`INSERT INTO \`${WP_PREFIX}termmeta\``) > 0
      ? sql.indexOf(`INSERT INTO \`${WP_PREFIX}termmeta\``)
      : sql.indexOf(`INSERT INTO \`${WP_PREFIX}usermeta\``)
  );

  // Pattern: (term_taxonomy_id, term_id, 'taxonomy', 'description', parent, count)
  const taxMatches = taxSection.match(/\(\d+,\s*\d+,\s*'[^']*',\s*'[^']*',\s*\d+,\s*\d+\)/g) || [];
  for (const match of taxMatches) {
    const values = parseTuple(match);
    if (values.length >= 3) {
      termTaxonomy.set(parseInt(values[0]), {
        termId: parseInt(values[1]),
        taxonomy: values[2],
      });
    }
  }
  console.log(`Found ${termTaxonomy.size} term taxonomies\n`);

  // ============================================
  // STEP 5: Extract term relationships
  // ============================================
  console.log('Extracting term relationships...');
  const termRelationships: { objectId: number; termTaxId: number }[] = [];

  const relSection = sql.substring(
    sql.indexOf(`INSERT INTO \`${WP_PREFIX}term_relationships\``),
    sql.indexOf(`INSERT INTO \`${WP_PREFIX}term_taxonomy\``)
  );

  // Pattern: (object_id, term_taxonomy_id, term_order)
  const relMatches = relSection.match(/\(\d+,\s*\d+,\s*\d+\)/g) || [];
  for (const match of relMatches) {
    const values = parseTuple(match);
    if (values.length >= 2) {
      termRelationships.push({
        objectId: parseInt(values[0]),
        termTaxId: parseInt(values[1]),
      });
    }
  }
  console.log(`Found ${termRelationships.length} term relationships\n`);

  // ============================================
  // STEP 6: Extract published posts
  // ============================================
  console.log('Extracting published posts...');
  const posts: WPPost[] = [];

  // Find posts section
  const postsStart = sql.indexOf(`INSERT INTO \`${WP_PREFIX}posts\``);
  const postsEnd = sql.indexOf(`INSERT INTO \`${WP_PREFIX}term`);
  const postsSection = sql.substring(postsStart, postsEnd);

  // Match post tuples - look for 'publish' status and 'post' type
  // Column order: ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, ...
  const postRegex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'publish',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*\d+,\s*'([^']*)',\s*\d+,\s*'post'/g;

  let postMatch;
  while ((postMatch = postRegex.exec(postsSection)) !== null) {
    posts.push({
      ID: parseInt(postMatch[1]),
      post_date: postMatch[3],
      post_content: cleanValue(`'${postMatch[5]}'`),
      post_title: cleanValue(`'${postMatch[6]}'`),
      post_excerpt: cleanValue(`'${postMatch[7]}'`),
      post_status: 'publish',
      post_name: postMatch[8],
      post_modified: postMatch[9],
      post_type: 'post',
      guid: postMatch[10],
    });
  }
  console.log(`Found ${posts.length} published posts\n`);

  // ============================================
  // STEP 7: Clear existing data and migrate
  // ============================================
  console.log('Clearing existing data...');
  await prisma.postTerm.deleteMany();
  await prisma.media.deleteMany();
  await prisma.post.deleteMany();
  await prisma.term.deleteMany();
  console.log('Existing data cleared.\n');

  // Migrate terms
  console.log('Migrating terms to database...');
  const termIdMap = new Map<number, number>(); // WP term_id -> new term id

  for (const [taxId, { termId, taxonomy }] of termTaxonomy) {
    if (taxonomy === 'category' || taxonomy === 'post_tag') {
      const term = terms.get(termId);
      if (term && !termIdMap.has(termId)) {
        try {
          const created = await prisma.term.upsert({
            where: { slug: term.slug },
            update: {},
            create: {
              name: term.name,
              slug: term.slug,
              taxonomy: taxonomy === 'post_tag' ? 'tag' : 'category',
            },
          });
          termIdMap.set(termId, created.id);
        } catch (error) {
          console.error(`Error creating term ${term.name}:`, error);
        }
      }
    }
  }
  console.log(`Created ${termIdMap.size} terms\n`);

  // Migrate posts
  console.log('Migrating posts to database...');
  let postCount = 0;
  const postIdMap = new Map<number, number>(); // WP post ID -> new post id

  for (const post of posts) {
    try {
      // Get featured image URL
      let featuredImage: string | null = null;
      const thumbnailId = thumbnailMap.get(post.ID);
      if (thumbnailId) {
        featuredImage = attachmentUrls.get(thumbnailId) || null;
      }

      // Calculate read time
      const readTime = calculateReadTime(post.post_content);

      // Create post
      const created = await prisma.post.create({
        data: {
          wpId: post.ID,
          title: post.post_title,
          slug: post.post_name,
          content: post.post_content,
          excerpt: post.post_excerpt || null,
          featuredImage: featuredImage,
          status: 'published',
          postType: 'post',
          readTime: readTime,
          publishedAt: new Date(post.post_date),
          createdAt: new Date(post.post_date),
          updatedAt: new Date(post.post_modified),
        },
      });

      postIdMap.set(post.ID, created.id);
      postCount++;

      if (postCount % 10 === 0) {
        console.log(`  Migrated ${postCount} posts...`);
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`  Skipping duplicate post: ${post.post_title}`);
      } else {
        console.error(`Error creating post "${post.post_title}":`, error.message);
      }
    }
  }
  console.log(`\nCreated ${postCount} posts\n`);

  // Create post-term relationships
  console.log('Creating post-term relationships...');
  let relationCount = 0;

  for (const rel of termRelationships) {
    const newPostId = postIdMap.get(rel.objectId);
    const taxData = termTaxonomy.get(rel.termTaxId);

    if (newPostId && taxData && termIdMap.has(taxData.termId)) {
      const newTermId = termIdMap.get(taxData.termId)!;

      try {
        await prisma.postTerm.create({
          data: {
            postId: newPostId,
            termId: newTermId,
          },
        });
        relationCount++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error('Error creating relationship:', error.message);
        }
      }
    }
  }
  console.log(`Created ${relationCount} post-term relationships\n`);

  // Summary
  console.log('='.repeat(50));
  console.log('Migration complete!');
  console.log('='.repeat(50));
  console.log(`Posts migrated: ${postCount}`);
  console.log(`Terms created: ${termIdMap.size}`);
  console.log(`Relationships created: ${relationCount}`);

  // List posts with featured images
  const postsWithImages = await prisma.post.count({
    where: { featuredImage: { not: null } },
  });
  console.log(`Posts with featured images: ${postsWithImages}`);
}

// Run migration
migrate()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
