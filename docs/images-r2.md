# Images on Cloudflare R2

Moved from CLAUDE.md on 15 Oct 2026.

All images must use the R2 public URL. Never use relative paths or the old
WordPress URL.

**R2 Public URL:** `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev`

## URL Patterns

| Image Type | URL Pattern | Example |
|------------|-------------|---------|
| **New blog images** | `{R2_URL}/blog/{year}/{filename}` | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2025/race-name-01.jpg` |
| **Migrated WordPress images** | `{R2_URL}/wp-uploads/{year}/{month}/{filename}` | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/wp-uploads/2021/01/arms-out.jpg` |
| **Site assets** | `{R2_URL}/{path}` | `https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/about/stephen.jpg` |

## Setting Image Paths for Blog Posts

```typescript
// CORRECT - Full R2 URL
featured_image: 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2025/race-name-01.jpg'

// WRONG - Relative path (will break)
featured_image: '/images/blog/2025/race-name-01.jpg'

// WRONG - Old WordPress URL (will break when old site is removed)
featured_image: 'https://filmmyrun.com/wp-content/uploads/2025/01/image.jpg'
```

## In HTML Content

```html
<!-- CORRECT -->
<figure>
  <img src="https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2025/race-photo.jpg" alt="Description" />
  <figcaption>Caption here</figcaption>
</figure>

<!-- WRONG -->
<img src="/images/blog/2025/race-photo.jpg" />
```

## Uploading New Images to R2

1. Place images in `public/images/` locally with proper folder structure
2. Run the migration script: `node scripts/migrate-images-to-r2.mjs`
3. Use the R2 URL in your database/content

Or upload manually via Cloudflare dashboard and use the resulting URL.
`src/lib/r2.ts` has the R2 utilities used by the app.

## Environment Variables (for scripts)

```
R2_ACCOUNT_ID=b98afe6a570b46e01a6352f32c02d035
R2_ACCESS_KEY_ID=<from Cloudflare>
R2_SECRET_ACCESS_KEY=<from Cloudflare>
R2_BUCKET_NAME=filmmyrun-images
R2_PUBLIC_URL=https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev
```

## Custom domain: never set up

`images.filmmyrun.co.uk` was planned as a custom domain for R2 but **was never
set up; the host does not resolve**. Images serve from the `pub-…r2.dev` URL
directly. If you do set the subdomain up, find/replace in the database and
codebase.
