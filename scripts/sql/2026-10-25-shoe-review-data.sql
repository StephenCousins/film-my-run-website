-- UI sweep X4 + X14 (25 Oct 2026). NOT RUN: review, then run against production
-- with an admin connection (ro-sql is read-only). Checked with ro-sql the same day.

BEGIN;

-- X4: 361° Eleos 2 (shoe 226). Review 1012 is a scrape of 361usa.com's own customer
-- reviews: "Overall rating: 4.8 / 5 from 13 reviews" stored as an EXPERT score of 9.6,
-- with one pasted customer review as the summary. It is a customer average, so keep it
-- as user_score / user_count, drop the pasted text, and stop counting it as a review.
UPDATE shoe_reviews
SET user_score = 9.6, user_count = 13, expert_score = NULL, summary = NULL
WHERE id = 1012 AND shoe_id = 226 AND source_url LIKE 'https://www.361usa.com/%';

-- Same sum recomputeShoeScore does (expert scores only, 1 dp).
UPDATE shoes s
SET avg_score = r.avg, review_count = r.n
FROM (
  SELECT round(avg(expert_score), 1) AS avg, count(expert_score)::int AS n
  FROM shoe_reviews WHERE shoe_id = 226
) r
WHERE s.id = 226;

-- X14: Dynafish Dyna Super (shoe 249). The stored image is not broken: it is a
-- 677x1000 portrait lifestyle shot whose top half is black backdrop, so a square card
-- crop shows a black box. Clear it; the weekly backfill (or
-- `npm run shoes -- image --slug dynafish-dyna-super --force`) finds a product shot.
UPDATE shoes SET image_url = NULL
WHERE id = 249 AND image_url = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/shoes/dynafish-dyna-super.jpg';

COMMIT;
