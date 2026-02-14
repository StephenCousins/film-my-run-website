-- AlterTable
ALTER TABLE "newsletter_issues" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "newsletter_issues" ADD COLUMN "approve_token" TEXT;
ALTER TABLE "newsletter_issues" ALTER COLUMN "recipient_count" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_issues_approve_token_key" ON "newsletter_issues"("approve_token");

-- Mark existing issues as already sent
UPDATE "newsletter_issues" SET "status" = 'sent' WHERE "status" = 'draft';
