-- Enums
CREATE TYPE "ShoeTerrain" AS ENUM ('road','trail','both');
CREATE TYPE "ShoeCategory" AS ENUM ('daily_trainer','race','long_run','speed','ultra','stability','max_cushion','minimal');
CREATE TYPE "ReviewSource" AS ENUM ('runrepeat','runners_world','irunfar','believe_in_run','the_run_testers','running_shoes_guru','road_trail_run','doctors_of_running','other');
CREATE TYPE "ShoeOrigin" AS ENUM ('seed','user','discovery');
CREATE TYPE "CandidateStatus" AS ENUM ('pending','published','held','rejected');

-- Brands
CREATE TABLE "shoe_brands" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "aliases" TEXT[] NOT NULL DEFAULT '{}',
  "domain" TEXT NOT NULL,
  "new_arrivals_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "shoe_brands" ("name","aliases","domain") VALUES
 ('Adidas','{adidas}','adidas.co.uk'),
 ('Altra','{altra,"altra running"}','altrarunning.com'),
 ('Arc''teryx','{arcteryx,"arc''teryx","arc teryx"}','arcteryx.com'),
 ('ASICS','{asics}','asics.com'),
 ('Avelo','{avelo}','avelorunning.com'),
 ('Brooks','{brooks,"brooks running"}','brooksrunning.com'),
 ('Craft','{craft,"craft sportswear"}','craftsportswear.com'),
 ('Dynafit','{dynafit}','dynafit.com'),
 ('Hoka','{hoka,"hoka one one"}','hoka.com'),
 ('Inov-8','{inov-8,inov8,"inov 8"}','inov-8.com'),
 ('Kiprun','{kiprun,"decathlon kiprun"}','decathlon.co.uk'),
 ('La Sportiva','{"la sportiva",sportiva}','lasportiva.com'),
 ('Li-Ning','{li-ning,"li ning",lining}','li-ning.com'),
 ('Mammut','{mammut}','mammut.com'),
 ('Merrell','{merrell}','merrell.com'),
 ('Mizuno','{mizuno}','mizuno.com'),
 ('New Balance','{"new balance",newbalance,nb}','newbalance.co.uk'),
 ('Nike','{nike}','nike.com'),
 ('Nnormal','{nnormal,"n normal"}','nnormal.com'),
 ('Norda','{norda}','nordarun.com'),
 ('On','{on,"on running",on-running}','on.com'),
 ('Puma','{puma}','puma.com'),
 ('Reebok','{reebok}','reebok.com'),
 ('Salomon','{salomon}','salomon.com'),
 ('Saucony','{saucony}','saucony.com'),
 ('Scott','{scott,"scott sports"}','scott-sports.com'),
 ('The North Face','{"the north face","north face",tnf}','thenorthface.com'),
 ('Topo Athletic','{topo,"topo athletic"}','topoathletic.com'),
 ('Under Armour','{"under armour",ua}','underarmour.co.uk'),
 ('VJ','{vj,"vj shoes","vj sport"}','vjshoes.com'),
 ('Xero Shoes','{xero,"xero shoes"}','xeroshoes.com');

-- Phantom row: the Ultra Raptor II is a La Sportiva shoe.
DELETE FROM "shoes" WHERE "slug" = 'asics-ultra-raptor-ii';

-- New shoe columns
ALTER TABLE "shoes"
  ADD COLUMN "brand_id" INTEGER,
  ADD COLUMN "release_date" TIMESTAMP(3),
  ADD COLUMN "image_source_url" TEXT,
  ADD COLUMN "image_method" TEXT,
  ADD COLUMN "image_verified_at" TIMESTAMP(3),
  ADD COLUMN "user_avg_score" DECIMAL(3,1),
  ADD COLUMN "user_rating_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "origin" "ShoeOrigin" NOT NULL DEFAULT 'seed',
  ADD COLUMN "added_by_user_id" INTEGER,
  ADD COLUMN "superseded_by_id" INTEGER;

-- Canonicalise brand text via aliases, then link
UPDATE "shoes" s SET "brand" = b."name"
FROM "shoe_brands" b
WHERE lower(s."brand") = ANY(b."aliases") OR lower(s."brand") = lower(b."name");

UPDATE "shoes" s SET "brand_id" = b."id" FROM "shoe_brands" b WHERE s."brand" = b."name";

-- Any brand still unlinked gets its own row so the NOT NULL holds
INSERT INTO "shoe_brands" ("name","aliases","domain")
SELECT DISTINCT s."brand", ARRAY[lower(s."brand")], lower(regexp_replace(s."brand", '[^A-Za-z0-9]', '', 'g')) || '.com'
FROM "shoes" s WHERE s."brand_id" IS NULL;
UPDATE "shoes" s SET "brand_id" = b."id" FROM "shoe_brands" b WHERE s."brand_id" IS NULL AND s."brand" = b."name";

ALTER TABLE "shoes" ALTER COLUMN "brand_id" SET NOT NULL;

-- Origin + added_by from description markers, then strip the markers
UPDATE "shoes" SET
  "origin" = 'user',
  "added_by_user_id" = (regexp_match("description", '\[added by user (\d+)\]'))[1]::int
WHERE "description" ~ '\[added by user \d+\]';
UPDATE "shoes" SET "origin" = 'discovery' WHERE "description" LIKE '%[auto-discovered]%';
UPDATE "shoes" SET "description" = NULLIF(btrim(regexp_replace("description", '\s*\[(added by user \d+|auto-discovered)\]', '', 'g')), '')
WHERE "description" ~ '\[(added by user \d+|auto-discovered)\]';

-- User rating aggregates
UPDATE "shoes" s SET
  "user_avg_score" = r.avg, "user_rating_count" = r.cnt
FROM (SELECT "shoe_id", round(avg("score"),1) AS avg, count(*) AS cnt FROM "shoe_user_ratings" GROUP BY "shoe_id") r
WHERE r."shoe_id" = s."id";

-- Enum casts
ALTER TABLE "shoes" ALTER COLUMN "terrain" TYPE "ShoeTerrain" USING "terrain"::"ShoeTerrain";
ALTER TABLE "shoes" ALTER COLUMN "category" TYPE "ShoeCategory" USING "category"::"ShoeCategory";
UPDATE "shoe_reviews" SET "source" = 'other'
WHERE "source" NOT IN ('runrepeat','runners_world','irunfar','believe_in_run','the_run_testers','running_shoes_guru','road_trail_run','doctors_of_running','other');
ALTER TABLE "shoe_reviews" ALTER COLUMN "source" TYPE "ReviewSource" USING "source"::"ReviewSource";

-- FKs and indexes
ALTER TABLE "shoes" ADD CONSTRAINT "shoes_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "shoe_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shoes" ADD CONSTRAINT "shoes_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "shoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "shoes_brand_id_idx" ON "shoes"("brand_id");
CREATE INDEX "shoes_user_avg_score_idx" ON "shoes"("user_avg_score");
CREATE INDEX "shoes_superseded_by_id_idx" ON "shoes"("superseded_by_id");

-- Candidates
CREATE TABLE "shoe_candidates" (
  "id" SERIAL PRIMARY KEY,
  "brand_id" INTEGER REFERENCES "shoe_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "brand_text" TEXT NOT NULL,
  "model_text" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "status" "CandidateStatus" NOT NULL DEFAULT 'pending',
  "hold_reasons" TEXT[] NOT NULL DEFAULT '{}',
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "shoe_id" INTEGER UNIQUE REFERENCES "shoes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3)
);
CREATE INDEX "shoe_candidates_status_idx" ON "shoe_candidates"("status");
