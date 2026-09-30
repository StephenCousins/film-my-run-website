-- Newsletter consent records (PECR). Additive and nullable: safe on the live tables.
ALTER TABLE "newsletter_subscribers" ADD COLUMN "basis" TEXT;
ALTER TABLE "newsletter_subscribers" ADD COLUMN "source" TEXT;
ALTER TABLE "newsletter_subscribers" ADD COLUMN "consented_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "newsletter_asked_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "newsletter" BOOLEAN;
